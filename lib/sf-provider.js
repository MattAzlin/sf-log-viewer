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

    // Inside lib/sf-provider.js -> getLogs method
    async getLogs(org, page = 1, filter = '', sortField = 'StartTime', sortOrder = 'DESC') {
        const pageSize = 20;
        const offset = (page - 1) * pageSize;

        let whereClause = filter ? `WHERE (Status LIKE '%${filter}%' OR Operation LIKE '%${filter}%')` : "";

        // Build the query with dynamic ORDER BY
        const soql = `SELECT Id, Operation, Status, StartTime, LogLength 
                   FROM ApexLog 
                   ${whereClause} 
                   ORDER BY ${sortField} ${sortOrder} 
                   LIMIT ${pageSize} OFFSET ${offset}`;

        const result = await this.execute(`sf data query --use-tooling-api --json --query "${soql}" --target-org "${org}"`);
        return result.records || [];
    },

    async getLogBody(org, logId) {
        // Increase maxBuffer to 50MB to handle large logs
        const { stdout } = await execPromise(`sf apex get log --log-id "${logId}" --target-org "${org}"`, {
            maxBuffer: 50 * 1024 * 1024
        });
        return stdout;
    }
};

module.exports = sf;
