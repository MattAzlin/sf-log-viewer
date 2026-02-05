const express = require('express');
const sf = require('./lib/sf-provider');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/api/orgs', async (req, res) => {
    try { res.json(await sf.getOrgs()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/logs', async (req, res) => {
    try {
        const { org, page, filter } = req.query;
        const logs = await sf.getLogs(org, parseInt(page), filter);
        res.json(logs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/log/:id', async (req, res) => {
    try {
        const body = await sf.getLogBody(req.query.org, req.params.id);
        res.json({ body });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));