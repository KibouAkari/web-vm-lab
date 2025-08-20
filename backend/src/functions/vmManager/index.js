const { DefaultAzureCredential } = require("@azure/identity");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    // API Key Validation
    if (req.headers["x-api-key"] !== process.env.API_KEY) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const credential = new DefaultAzureCredential();
    const computeClient = new ComputeManagementClient(
      credential,
      process.env.AZURE_SUBSCRIPTION_ID
    );

    // Table Storage Client
    const tableClient = TableClient.fromConnectionString(
      process.env.AzureWebJobsStorage,
      "vmtable"
    );

    switch (req.body?.action) {
      case "list":
        const vms = await computeClient.virtualMachines.list(
          process.env.AZURE_RESOURCE_GROUP
        );
        context.res = { status: 200, body: Array.from(vms) };
        break;

      case "create":
        // VM Creation Logic
        const vmName = req.body.name || `vm-${Date.now()}`;
        await computeClient.virtualMachines.beginCreateOrUpdate(
          process.env.AZURE_RESOURCE_GROUP,
          vmName,
          {
            location: "westeurope",
            hardwareProfile: { vmSize: "Standard_B1s" },
            osProfile: {
              computerName: vmName,
              adminUsername: "vmadmin",
              adminPassword: "ComplexPass123!",
            },
            networkProfile: {
              networkInterfaces: [],
            },
            storageProfile: {
              imageReference: {
                publisher: "Canonical",
                offer: "UbuntuServer",
                sku: "18.04-LTS",
                version: "latest",
              },
            },
          }
        );

        // Save VM info to Table Storage
        await tableClient.createEntity({
          partitionKey: "vms",
          rowKey: vmName,
          createdAt: new Date().toISOString(),
        });

        context.res = {
          status: 200,
          body: { message: "VM creation started", name: vmName },
        };
        break;

      default:
        context.res = { status: 400, body: "Invalid action specified" };
    }
  } catch (error) {
    context.log.error(error);
    context.res = { status: 500, body: error.message };
  }
};
