let currentPage = 1;
let currentSortField = 'StartTime';
let currentSortOrder = 'DESC';

const orgSelect = document.getElementById('orgSelect');
const logTable = document.getElementById('logTable');
const logContent = document.getElementById('logContent');
const searchInput = document.getElementById('searchInput');
const downloadBtn = document.getElementById('downloadBtn');

async function init() {
    try {
        const res = await fetch('/api/orgs');
        const orgs = await res.json();
        if (orgs.error) throw new Error(orgs.error);

        orgSelect.innerHTML = orgs.map(o => {
            const val = o.alias || o.username;
            return `<option value="${val}">${val}</option>`;
        }).join('');

        loadLogs();
    } catch (err) {
        logTable.innerHTML = `<tr><td colspan="5" style="color:red">Error: ${err.message}</td></tr>`;
    }
}

function setSort(field) {
    if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'DESC' ? 'ASC' : 'DESC';
    } else {
        currentSortField = field;
        currentSortOrder = 'DESC';
    }
    currentPage = 1;
    loadLogs();
}

async function loadLogs() {
    const org = orgSelect.value;
    if (!org || org === "Loading...") return;

    logTable.innerHTML = '<tr><td colspan="5">Fetching logs via CLI...</td></tr>';
    const filter = encodeURIComponent(searchInput.value);

    try {
        const url = `/api/logs?org=${encodeURIComponent(org)}&page=${currentPage}&filter=${filter}&sortField=${currentSortField}&sortOrder=${currentSortOrder}`;
        const res = await fetch(url);
        const logs = await res.json();

        if (logs.error) throw new Error(logs.error);

        logTable.innerHTML = logs.map(l => `
            <tr>
                <td>${new Date(l.StartTime).toLocaleString()}</td>
                <td>${l.Operation}</td>
                <td class="${l.Status !== 'Success' ? 'log-fail' : ''}">${l.Status}</td>
                <td>${(l.LogLength / 1024).toFixed(1)} KB</td>
                <td><button onclick="viewLog('${l.Id}')">View</button></td>
            </tr>
        `).join('');
    } catch (err) {
        logTable.innerHTML = `<tr><td colspan="5" style="color:red">${err.message}</td></tr>`;
    }
    document.getElementById('pageDisplay').innerText = `Page ${currentPage} (Sorted by ${currentSortField} ${currentSortOrder})`;
}

async function viewLog(id) {
    const org = orgSelect.value;
    logContent.innerText = "Downloading full log content...";
    downloadBtn.style.display = 'none';

    try {
        const res = await fetch(`/api/log/${id}?org=${encodeURIComponent(org)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Preview limit for UI performance
        logContent.innerText = data.body.length > 20000
            ? data.body.substring(0, 20000) + "\n\n... [TRUNCATED FOR PREVIEW - DOWNLOAD FOR FULL CONTENT] ..."
            : data.body;

        downloadBtn.style.display = 'block';
        downloadBtn.onclick = () => {
            const blob = new Blob([data.body], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Log_${id}.log`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    } catch (err) {
        logContent.innerText = "Error fetching log: " + err.message;
    }
}

// Event bindings
orgSelect.onchange = () => { currentPage = 1; loadLogs(); };
document.getElementById('searchBtn').onclick = () => { currentPage = 1; loadLogs(); };
document.getElementById('nextBtn').onclick = () => { currentPage++; loadLogs(); };
document.getElementById('prevBtn').onclick = () => { if(currentPage > 1) { currentPage--; loadLogs(); } };

init();