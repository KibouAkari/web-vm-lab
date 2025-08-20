const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "vmtable";

const credential = new AzureNamedKeyCredential(accountName, accountKey);
const client = new TableClient(
  `https://${accountName}.table.core.windows.net`,
  tableName,
  credential
);

async function initializeTable() {
  try {
    await client.createTable(tableName);
  } catch (error) {
    if (error.statusCode !== 409) {
      // 409 means table already exists
      throw error;
    }
  }
}

async function saveVM(vm) {
  const entity = {
    partitionKey: "vms",
    rowKey: vm.name,
    ...vm,
    timestamp: new Date(),
  };
  await client.upsertEntity(entity);
}

async function getVM(vmName) {
  try {
    return await client.getEntity("vms", vmName);
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

async function listVMs() {
  const entities = client.listEntities();
  const vms = [];
  for await (const entity of entities) {
    vms.push(entity);
  }
  return vms;
}

// Option 1: Table Storage vollständig nutzen
async function getVMStatus(context, computeClient, networkClient, vmName) {
  const vmData = await getVM(vmName);
  const os = vmData?.os || "unknown";
}

module.exports = {
  initializeTable,
  saveVM,
  getVM,
  listVMs,
};
