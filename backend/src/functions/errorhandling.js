const { saveVM, getVM } = require("../../services/tableService");

function handleError(context, error) {
  context.log.error(error);
  return {
    status: error.status || 500,
    body: {
      error: error.message,
      details: error.details || undefined,
    },
  };
}

module.exports = {
  handleError,
};
