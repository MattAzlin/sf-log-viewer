let currentPage = 1;
let currentSortField = 'StartTime';
let currentSortOrder = 'DESC';
const orgSelect = document.getElementById('orgSelect');
const logTable = document.getElementById('logTable');
const logContent = document.getElementById('logContent');
const searchInput = document.getElementById('searchInput');
const downloadBtn = document.getElementById('downloadBtn');

async function init() {
    const res = await fetch('/api/orgs');
    const orgs = await res.json();
    if(orgs.error) { alert(orgs.error); return; }

    orgSelect.innerHTML = orgs.map(o => {
        const name = o.alias || o.username;
        return `<option value="${name}">${name}</option>`;
    }).join('');

    loadLogs();
}

// Function to handle header clicks
function setSort(field) {
    if (currentSortField === field) {
        // Toggle direction if clicking the same field
        currentSortOrder = currentSortOrder === 'DESC' ? 'ASC' : 'DESC';
    } else {
        // Default to DESC for new fields
        currentSortField = field;
        currentSortOrder = 'DESC';
    }
    currentPage = 1; // Reset to page 1 when sorting changes
    loadLogs();
}

async function loadLogs() {
    const org = orgSelect.value;
    if (!org || org === "Loading...") return;

    logTable.innerHTML = '<tr><td colspan="5">Sorting logs...</td></tr>';
    const filter = encodeURIComponent(searchInput.value);

    try {
        // Added sortField and sortOrder to the URL parameters
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
    document.getElementById('pageDisplay').innerText = `Page ${currentPage} (Sorted by ${currentSortField})`;
}

async function viewLog(id) {
    const org = orgSelect.value;
    logContent.innerText = "Downloading large log file...";
    downloadBtn.style.display = 'none'; // Hide until ready

    try {
        const res = await fetch(`/api/log/${id}?org=${encodeURIComponent(org)}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        // UI Performance: Only preview the first 10k characters
        const previewLimit = 10000;
        if (data.body.length > previewLimit) {
            logContent.innerText = data.body.substring(0, previewLimit) +
                "\n\n--- LOG TRUNCATED IN PREVIEW. DOWNLOAD FOR FULL CONTENT ---";
        } else {
            logContent.innerText = data.body;
        }

        // Setup Download
        downloadBtn.style.display = 'block';
        downloadBtn.onclick = () => {
            // Use a Blob to handle large data efficiently
            const blob = new Blob([data.body], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Log_${id}.log`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // Clean up memory
        };
    } catch (err) {
        logContent.innerText = "Error: " + err.message;
    }
}

orgSelect.onchange = () => { currentPage = 1; loadLogs(); };
document.getElementById('searchBtn').onclick = () => { currentPage = 1; loadLogs(); };
document.getElementById('nextBtn').onclick = () => { currentPage++; loadLogs(); };
document.getElementById('prevBtn').onclick = () => { if(currentPage > 1) { currentPage--; loadLogs(); } };

init();
