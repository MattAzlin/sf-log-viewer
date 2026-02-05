const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const sf = {
    async execute(command) {
        try {
            console.log("Running CLI:", command);
            // maxBuffer set to 50MB; env variables prevent interactive CLI hangs
            const { stdout, stderr } = await execPromise(command, {
                maxBuffer: 50 * 1024 * 1024,
                env: { ...process.env, SF_NO_VERSION_CHECK: 'true', SF_DISABLE_AUTOUPDATE: 'true' }
            });

            const data = JSON.parse(stdout);
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
        // Filter for Production/Sandbox orgs only
        return result.nonScratchOrgs || [];
    },

    async getLogs(org, page = 1, filter = '', sortField = 'StartTime', sortOrder = 'DESC') {
        const pageSize = 20;
        const offset = (page - 1) * pageSize;

        // Use single quotes for internal SOQL strings for Windows cmd.exe compatibility
        let whereClause = filter ? `WHERE (Status LIKE '%${filter}%' OR Operation LIKE '%${filter}%')` : "";

        const soql = `SELECT Id, Operation, Status, StartTime, LogLength FROM ApexLog ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ${pageSize} OFFSET ${offset}`;

        const result = await this.execute(`sf data query --use-tooling-api --json --query "${soql}" --target-org "${org}"`);
        return result.records || [];
    },

    async getLogBody(org, logId) {
        // High buffer limit for log content retrieval
        const command = `sf apex get log --log-id "${logId}" --target-org "${org}"`;
        const { stdout } = await execPromise(command, { maxBuffer: 50 * 1024 * 1024 });
        return stdout;
    }
};

module.exports = sf;