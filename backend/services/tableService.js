const { TableClient } = require("@azure/data-tables");

const accountName = process.env.STORAGE_ACCOUNT_NAME;
const accountKey = process.env.STORAGE_ACCOUNT_KEY;
const tableName = "vmtable";

const client = new TableClient(
  `https://${accountName}.table.core.windows.net`,
  tableName,
  { accountName, accountKey }
);

async function saveVM(vm) {
  const entity = {
    partitionKey: "vms",
    rowKey: vm.vmName,
    ...vm,
  };
  await client.upsertEntity(entity);
}

async function getVM(vmName) {
  try {
    return await client.getEntity("vms", vmName);
  } catch (error) {
    if (error.statusCode === 404) return null;
    throw error;
  }
}

async function getAllVMs() {
  const vms = [];
  const entities = client.listEntities();
  for await (const entity of entities) {
    vms.push(entity);
  }
  return vms;
}

module.exports = {
  saveVM,
  getVM,
  getAllVMs,
};
