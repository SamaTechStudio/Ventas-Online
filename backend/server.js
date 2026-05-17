const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL || 'https://mgkbfepahlldulvdtvqh.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..')));

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function handleError(res, error) {
  console.error(error);
  return res.status(500).json({ message: error.message || 'Error interno del servidor' });
}

app.get('/api/brand', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('brand').select('*').single();
  if (error && (error.code === 'PGRST116' || error.message?.includes('No rows found'))) {
    return res.json(null);
  }
  if (error) return handleError(res, error);
  res.json(data);
});

app.post('/api/brand', async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ message: 'Payload inválido para marca.' });
  }

  const { data: existing, error: selectError } = await supabaseAdmin.from('brand').select('id').single();
  if (selectError && !(selectError.code === 'PGRST116' || selectError.message?.includes('No rows found'))) {
    return handleError(res, selectError);
  }

  if (existing?.id) {
    const { error } = await supabaseAdmin.from('brand').update(payload).eq('id', existing.id);
    if (error) return handleError(res, error);
    return res.json({ message: 'Marca actualizada correctamente.' });
  }

  const { error } = await supabaseAdmin.from('brand').insert(payload);
  if (error) return handleError(res, error);
  res.json({ message: 'Marca creada correctamente.' });
});

app.get('/api/bank', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('bank_info').select('*').single();
  if (error && (error.code === 'PGRST116' || error.message?.includes('No rows found'))) {
    return res.json(null);
  }
  if (error) return handleError(res, error);
  res.json(data);
});

app.post('/api/bank', async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ message: 'Payload inválido para datos bancarios.' });
  }

  const { data: existing, error: selectError } = await supabaseAdmin.from('bank_info').select('id').single();
  if (selectError && !(selectError.code === 'PGRST116' || selectError.message?.includes('No rows found'))) {
    return handleError(res, selectError);
  }

  if (existing?.id) {
    const { error } = await supabaseAdmin.from('bank_info').update(payload).eq('id', existing.id);
    if (error) return handleError(res, error);
    return res.json({ message: 'Datos bancarios actualizados correctamente.' });
  }

  const { error } = await supabaseAdmin.from('bank_info').insert(payload);
  if (error) return handleError(res, error);
  res.json({ message: 'Datos bancarios guardados correctamente.' });
});

app.get('/api/products', async (req, res) => {
  const { id } = req.query;
  if (id) {
    const { data, error } = await supabaseAdmin.from('products').select('*').eq('id', id).single();
    if (error && (error.code === 'PGRST116' || error.message?.includes('No rows found'))) {
      return res.json(null);
    }
    if (error) return handleError(res, error);
    return res.json(data);
  }

  const { data, error } = await supabaseAdmin.from('products').select('*').order('created_at', { ascending: false });
  if (error) return handleError(res, error);
  res.json(data);
});

app.post('/api/products', async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ message: 'Payload inválido para producto.' });
  }

  const productData = {
    name: payload.name,
    price: payload.price,
    description: payload.description,
    image: payload.image || null,
    active: payload.active !== false,
    slug: payload.slug || slugify(payload.name || ''),
  };

  if (!productData.name || !productData.price || !productData.description) {
    return res.status(400).json({ message: 'Nombre, precio y descripción son obligatorios.' });
  }

  if (payload.id) {
    const { error } = await supabaseAdmin.from('products').update(productData).eq('id', payload.id);
    if (error) return handleError(res, error);
    return res.json({ message: 'Producto actualizado correctamente.' });
  }

  const { error } = await supabaseAdmin.from('products').insert(productData);
  if (error) return handleError(res, error);
  res.json({ message: 'Producto agregado correctamente.' });
});

app.delete('/api/products/:id', async (req, res) => {
  const id = req.params.id;
  const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
  if (error) return handleError(res, error);
  res.json({ message: 'Producto eliminado correctamente.' });
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  const { bucket } = req.body;
  const file = req.file;

  if (!bucket || !file) {
    return res.status(400).json({ message: 'Bucket e imagen son requeridos.' });
  }

  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(fileName, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) return handleError(res, error);

  const { data: urlData, error: urlError } = await supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
  if (urlError || !urlData?.publicUrl) {
    return handleError(res, urlError || new Error('No se pudo obtener URL pública.'));
  }

  res.json({ publicUrl: urlData.publicUrl });
});

app.listen(port, () => {
  console.log(`Backend seguro iniciado en http://localhost:${port}`);
  console.log('Asegúrate de servir el frontend desde el mismo origen o usar el API_BASE_URL correcto.');
});
