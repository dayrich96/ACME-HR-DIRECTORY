const express = require('express');
const { Client } = require('pg'); // Properly import Client
const app = express();
const port = 3000;

// Database configuration
const client = new Client({
  user: 'postgres',
  password: 'Richday@9675', 
  host: 'localhost',
  port: 5432,
  database: 'HR_DB'
});

// Connect to database
client.connect(err => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
    process.exit(1); // Exit if can't connect
  } else {
    console.log('✅ Connected to PostgreSQL database HR_DB');
  }
});

// Middleware
app.use(express.json());

// Routes

// GET /api/employees - Returns array of employees
app.get('/api/employees', async (req, res) => {
  console.log('Attempting to fetch employees...');
  
  try {
    // Get employees with department names
    const { rows } = await client.query(`
      SELECT e.id, e.name, e.created_at, 
             d.id as department_id, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.id
    `);
    
    if (!rows.length) {
      console.warn('Query succeeded but no employees found');
      return res.status(404).json({ 
        error: 'No employees found',
        solution: 'Seed the database with sample data'
      });
    }

    console.log(`Fetched ${rows.length} employees successfully`);
    res.json(rows);
    
  } catch (err) {
    console.error('Full error context:', {
      timestamp: new Date(),
      error: err.message,
      stack: err.stack,
      code: err.code
    });

    res.status(500).json({
      error: 'Failed to fetch employees',
      details: {
        code: err.code,
        hint: err.hint || 'Check database connection and tables'
      }
    });
  }
});

// GET /api/departments - Returns array of departments
app.get('/api/departments', async (req, res) => {
  try {
    const { rows } = await client.query('SELECT * FROM departments ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /api/employees - Creates new employee
app.post('/api/employees', async (req, res) => {
  const { name, department_id } = req.body;
  
  if (!name || !department_id) {
    return res.status(400).json({ error: 'Name and department_id are required' });
  }

  try {
    const { rows } = await client.query(
      'INSERT INTO employees (name, department_id) VALUES ($1, $2) RETURNING *',
      [name, department_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating employee:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id - Updates employee
app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, department_id } = req.body;

  if (!name || !department_id) {
    return res.status(400).json({ error: 'Name and department_id are required' });
  }

  try {
    const { rows } = await client.query(
      `UPDATE employees 
       SET name = $1, department_id = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [name, department_id, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id - Deletes employee
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await client.query(
      'DELETE FROM employees WHERE id = $1',
      [id]
    );
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Clean up on server close
process.on('SIGINT', async () => {
  await client.end();
  console.log('Database client disconnected');
  process.exit();
});

// Start server
app.listen(port, () => {
  console.log(`HR Directory API running on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('GET    /api/employees');
  console.log('GET    /api/departments');
  console.log('POST   /api/employees');
  console.log('PUT    /api/employees/:id');
  console.log('DELETE /api/employees/:id');
});