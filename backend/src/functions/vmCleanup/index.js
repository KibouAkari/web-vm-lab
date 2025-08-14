const { DefaultAzureCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { NetworkManagementClient } = require("@azure/arm-network");

// Hier solltest du eine persistente Datenbank verwenden!
// Für Demo: importiere vmStore aus vmManager.js (nur lokal möglich)

module.exports = async function (context, myTimer) {
  const credential = new DefaultAzureCredential();
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
  const computeClient = new ComputeManagementClient(credential, subscriptionId);
  const networkClient = new NetworkManagementClient(credential, subscriptionId);

  // TODO: Hole alle VMs aus deiner Datenbank und prüfe expiresAt
  // Beispiel: [{ vmName, expiresAt, status }]
  const expiredVMs = []; // Hier Datenbankabfrage einbauen

  for (const vm of expiredVMs) {
    if (vm.status !== "deleted" && Date.now() > vm.expiresAt) {
      // deleteVM(context, computeClient, networkClient, vm.vmName);
      context.log(`VM ${vm.vmName} wird gelöscht (Timer-Trigger).`);
    }
  }
};
