const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const sf = {
    async execute(command) {
        try {
            console.log("Running CLI:", command);
            const { stdout, stderr } = await execPromise(command, {
                env: { ...process.env, SF_NO_VERSION_CHECK: 'true' }
            });

            const data = JSON.parse(stdout);

            // Check for the "result" vs "Result" discrepancy
            const finalResult = data.result || data.Result;

            if (!finalResult && data.status !== 0) {
                throw new Error(data.message || "CLI Error: No result returned.");
            }

            return finalResult;
        } catch (error) {
            console.error("CLI Execution Error:", error.message);
            throw error;
        }
    },

    async getOrgs() {
        const result = await this.execute('sf org list --json');
        return result.nonScratchOrgs || [];
    },

    async getLogs(org, page = 1, filter = '') {
        const pageSize = 20;
        const offset = (page - 1) * pageSize;
        let whereClause = filter ? `WHERE (Status LIKE '%${filter}%' OR Operation LIKE '%${filter}%')` : "";

        const soql = `SELECT Id, Operation, Status, StartTime, LogLength FROM ApexLog ${whereClause} ORDER BY StartTime DESC LIMIT ${pageSize} OFFSET ${offset}`;

        // Strict quoting to prevent "no default environment" errors
        const result = await this.execute(`sf data query --use-tooling-api --json --query "${soql}" --target-org "${org}"`);
        return result.records || [];
    },

    async getLogBody(org, logId) {
        const { stdout } = await execPromise(`sf apex get log --log-id "${logId}" --target-org "${org}"`);
        return stdout;
    }
};

module.exports = sf;