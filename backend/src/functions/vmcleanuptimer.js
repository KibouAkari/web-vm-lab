const { listVMs } = require("../../services/tableService");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { DefaultAzureCredential } = require("@azure/identity");

module.exports = async function (context, myTimer) {
  const timeStamp = new Date().toISOString();
  const credential = new DefaultAzureCredential();
  const computeClient = new ComputeManagementClient(
    credential,
    process.env.AZURE_SUBSCRIPTION_ID
  );

  try {
    const vms = await listVMs();
    for (const vm of vms) {
      const creationTime = new Date(vm.timestamp);
      const now = new Date();
      const hoursDiff = Math.abs(now - creationTime) / 36e5; // Convert to hours

      if (hoursDiff >= 24) {
        // Delete VMs older than 24 hours
        context.log(`Deleting VM ${vm.name} as it's older than 24 hours`);
        await computeClient.virtualMachines.beginDelete(
          process.env.AZURE_RESOURCE_GROUP,
          vm.name
        );
      }
    }

    context.log("VM cleanup completed successfully", timeStamp);
  } catch (error) {
    context.log.error("Error during VM cleanup:", error);
    throw error;
  }
};
