require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
const LEADS_FILE = path.join(DATA, 'leads.json');
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);

app.use(express.static(PUBLIC, { maxAge: '1d', etag: true }));

app.post('/api/leads', (req, res) => {
  const { nome, veiculo, servico, turno } = req.body || {};
  if (!nome || !veiculo || !servico || !turno) {
    return res.status(400).json({ ok: false, error: 'Campos obrigatórios ausentes.' });
  }
  const lead = {
    id: Date.now(),
    nome: String(nome).slice(0, 120),
    veiculo: String(veiculo).slice(0, 120),
    servico: String(servico).slice(0, 60),
    turno: String(turno).slice(0, 60),
    createdAt: new Date().toISOString(),
    ip: req.ip
  };
  try {
    const list = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    list.push(lead);
    fs.writeFileSync(LEADS_FILE, JSON.stringify(list, null, 2));
    return res.json({ ok: true, id: lead.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Falha ao salvar lead.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'cta-premium', uptime: process.uptime() }));

app.get('*', (_req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));

app.listen(PORT, () => console.log(`CTA Premium running on http://localhost:${PORT}`));
