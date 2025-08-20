const { DefaultAzureCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { NetworkManagementClient } = require("@azure/arm-network");
const crypto = require("crypto");
const { saveVM, getVM } = require("../../services/tableService");

const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const location = "westeurope";
const vnetName = "myVnet";
const subnetName = "default";
const VM_LIFETIME_MS = 60 * 60 * 1000; // 1 Stunde

const vmStore = {}; // Temporärer In-Memory Storage

function log(context, msg, ...args) {
  context.log(`[VMManager] ${msg}`, ...args);
}

function generatePassword() {
  return crypto.randomBytes(8).toString("base64");
}

function getUserIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    "0.0.0.0"
  );
}

function getImageReference(osChoice) {
  switch (osChoice) {
    case "ubuntu":
      return {
        publisher: "Canonical",
        offer: "0001-com-ubuntu-server-focal",
        sku: "20_04-lts-gen2",
        version: "latest",
      };
    case "kali":
      return {
        publisher: "kali-linux",
        offer: "kali-linux",
        sku: "kali",
        version: "latest",
      };
    case "windows10":
      return {
        publisher: "MicrosoftWindowsDesktop",
        offer: "Windows-10",
        sku: "21h2-pro",
        version: "latest",
      };
    default:
      throw new Error("Unsupported OS");
  }
}

function getCloudInit(os, username, password) {
  if (os === "ubuntu" || os === "kali") {
    return `#cloud-config
package_update: true
packages:
  - xrdp
users:
  - name: ${username}
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: users, admin
    shell: /bin/bash
    lock_passwd: false
    passwd: ${password}
runcmd:
  - systemctl enable xrdp
  - systemctl start xrdp
`;
  }
  return undefined;
}

function getWindowsCustomData(username, password) {
  // Powershell script to enable RDP and create user
  return Buffer.from(
    `
<powershell>
net user ${username} ${password} /add
net localgroup administrators ${username} /add
Set-ItemProperty -Path 'HKLM:\\System\\CurrentControlSet\\Control\\Terminal Server' -Name 'fDenyTSConnections' -Value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
</powershell>
`
  ).toString("base64");
}

async function createNetworkResources(context, networkClient, vmName, userIp) {
  const publicIpName = `${vmName}-ip`;
  const nicName = `${vmName}-nic`;
  log(context, "Creating Public IP...");
  const publicIp =
    await networkClient.publicIPAddresses.beginCreateOrUpdateAndWait(
      resourceGroup,
      publicIpName,
      {
        location,
        publicIPAllocationMethod: "Dynamic",
      }
    );

  log(context, "Creating NIC...");
  const subnetId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Network/virtualNetworks/${vnetName}/subnets/${subnetName}`;
  const nic = await networkClient.networkInterfaces.beginCreateOrUpdateAndWait(
    resourceGroup,
    nicName,
    {
      location,
      ipConfigurations: [
        {
          name: "ipConfig",
          subnet: { id: subnetId },
          publicIPAddress: { id: publicIp.id },
        },
      ],
      networkSecurityGroup: {
        location,
        securityRules: [
          {
            name: "AllowUserRDP",
            protocol: "Tcp",
            sourcePortRange: "*",
            destinationPortRange: "3389",
            sourceAddressPrefix: userIp,
            destinationAddressPrefix: "*",
            access: "Allow",
            priority: 100,
            direction: "Inbound",
          },
          {
            name: "AllowUserSSH",
            protocol: "Tcp",
            sourcePortRange: "*",
            destinationPortRange: "22",
            sourceAddressPrefix: userIp,
            destinationAddressPrefix: "*",
            access: "Allow",
            priority: 110,
            direction: "Inbound",
          },
        ],
      },
    }
  );
  return { publicIp, nic };
}

async function createVM(context, req, computeClient, networkClient) {
  try {
    const osChoice = req.body?.os || "ubuntu";
    const vmName = req.body?.vmName || `vm-${Date.now()}`;
    const duration = req.body?.duration || VM_LIFETIME_MS;
    const userIp = getUserIp(req);
    const username = "azureuser";
    const password = generatePassword();

    log(context, `Starting VM: ${vmName} (${osChoice}) for IP ${userIp}`);

    const imageReference = getImageReference(osChoice);
    const { publicIp, nic } = await createNetworkResources(
      context,
      networkClient,
      vmName,
      userIp
    );

    let customData;
    if (osChoice === "windows10") {
      customData = getWindowsCustomData(username, password);
    } else {
      customData = Buffer.from(
        getCloudInit(osChoice, username, password)
      ).toString("base64");
    }

    const vmParams = {
      location,
      hardwareProfile: { vmSize: "Standard_B1s" },
      storageProfile: {
        imageReference,
        osDisk: { createOption: "FromImage" },
      },
      osProfile: {
        computerName: vmName,
        adminUsername: username,
        adminPassword: password,
        customData,
      },
      networkProfile: { networkInterfaces: [{ id: nic.id }] },
    };

    log(context, "Creating VM...");
    await computeClient.virtualMachines.beginCreateOrUpdateAndWait(
      resourceGroup,
      vmName,
      vmParams
    );

    // Store VM info for timer
    await saveVM({
      vmName,
      os: osChoice,
      ip: publicIp.ipAddress,
      status: "running",
      expiresAt: Date.now() + duration,
      password,
      username,
    });

    log(context, `VM ${vmName} started. IP: ${publicIp.ipAddress}`);
    return {
      vmName,
      ip: publicIp.ipAddress,
      os: osChoice,
      status: "running",
      password,
      username,
      message: "VM erfolgreich gestartet.",
    };
  } catch (error) {
    log(context, `Fehler beim Erstellen der VM: ${error.message}`);
    throw new Error(`VM Erstellung fehlgeschlagen: ${error.message}`);
  }
}

async function stopVM(context, computeClient, vmName) {
  log(context, `Stopping VM: ${vmName}`);
  await computeClient.virtualMachines.beginPowerOffAndWait(
    resourceGroup,
    vmName
  );
  const vm = await getVM(vmName);
  if (vm) vm.status = "stopped";
  return { vmName, status: "stopped", message: "VM gestoppt." };
}

async function deleteVM(context, computeClient, networkClient, vmName) {
  log(context, `Deleting VM: ${vmName}`);
  try {
    await computeClient.virtualMachines.beginDeleteAndWait(
      resourceGroup,
      vmName
    );
  } catch (e) {
    log(context, `VM delete error (may not exist): ${e.message}`);
  }
  // Delete NIC & IP
  try {
    await networkClient.networkInterfaces.beginDeleteAndWait(
      resourceGroup,
      `${vmName}-nic`
    );
    await networkClient.publicIPAddresses.beginDeleteAndWait(
      resourceGroup,
      `${vmName}-ip`
    );
  } catch (e) {
    log(context, `NIC/IP delete error: ${e.message}`);
  }
  const vm = await getVM(vmName);
  if (vm) vm.status = "deleted";
  return { vmName, status: "deleted", message: "VM gelöscht." };
}

async function getVMStatus(context, computeClient, networkClient, vmName) {
  log(context, `Getting status for VM: ${vmName}`);
  try {
    const vm = await computeClient.virtualMachines.get(resourceGroup, vmName);
    const instanceView = await computeClient.virtualMachines.instanceView(
      resourceGroup,
      vmName
    );
    const publicIp = await networkClient.publicIPAddresses.get(
      resourceGroup,
      `${vmName}-ip`
    );
    const status =
      instanceView.statuses?.find((s) => s.code.startsWith("PowerState/"))
        ?.displayStatus || "unknown";
    const os = vmStore[vmName]?.os || "unknown";
    return {
      vmName,
      ip: publicIp.ipAddress,
      os,
      status: status.toLowerCase().includes("running") ? "running" : "stopped",
      message: `VM Status: ${status}`,
    };
  } catch (e) {
    log(context, `Status error: ${e.message}`);
    return { vmName, status: "deleted", message: "VM existiert nicht mehr." };
  }
}

// Timer: Delete expired VMs (simulate with setInterval, replace with Azure Timer Trigger in prod)
setInterval(async () => {
  for (const [vmName, info] of Object.entries(vmStore)) {
    if (info.status !== "deleted" && Date.now() > info.expiresAt) {
      const credential = new DefaultAzureCredential();
      const computeClient = new ComputeManagementClient(
        credential,
        subscriptionId
      );
      const networkClient = new NetworkManagementClient(
        credential,
        subscriptionId
      );
      await deleteVM({ log: () => {} }, computeClient, networkClient, vmName);
    }
  }
}, 60 * 1000);

// Am Anfang der Datei nach den Imports:
if (!subscriptionId || !resourceGroup) {
  throw new Error(
    "AZURE_SUBSCRIPTION_ID und AZURE_RESOURCE_GROUP müssen in den Umgebungsvariablen gesetzt sein"
  );
}

// Main Azure Function
module.exports = async function (context, req) {
  const credential = new DefaultAzureCredential();
  const computeClient = new ComputeManagementClient(credential, subscriptionId);
  const networkClient = new NetworkManagementClient(credential, subscriptionId);

  try {
    const { os, action, vmName, duration } = req.body || {};
    log(
      context,
      `API Request: action=${action}, vmName=${vmName}, os=${os}, duration=${duration}`
    );

    let result;
    switch (action) {
      case "start":
        result = await createVM(context, req, computeClient, networkClient);
        break;
      case "stop":
        if (!vmName) throw new Error("vmName erforderlich für stop");
        result = await stopVM(context, computeClient, vmName);
        break;
      case "delete":
        if (!vmName) throw new Error("vmName erforderlich für delete");
        result = await deleteVM(context, computeClient, networkClient, vmName);
        break;
      case "status":
        if (!vmName) throw new Error("vmName erforderlich für status");
        result = await getVMStatus(
          context,
          computeClient,
          networkClient,
          vmName
        );
        break;
      case "extend":
        if (!vmName) throw new Error("vmName erforderlich für extend");
        if (!vmStore[vmName]) throw new Error("VM nicht gefunden");
        vmStore[vmName].expiresAt = Date.now() + (duration || VM_LIFETIME_MS);
        result = {
          vmName,
          status: vmStore[vmName].status,
          message: "VM verlängert.",
        };
        break;
      default:
        throw new Error("Ungültige action");
    }

    context.res = { status: 200, body: result };
  } catch (error) {
    log(context, "Error:", error.message);
    context.res = {
      status: 500,
      body: { error: error.message, stack: error.stack },
    };
  }
};
