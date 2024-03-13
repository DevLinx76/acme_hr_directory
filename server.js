const pg = require('pg');
const express = require('express');
const app = express();
const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/acme_hr_directory_db');

// body parsing middleware
app.use(express.json());

// logging middleware
app.use(require('morgan')('dev'));

// GET /api/employees - returns array of employees
app.get('/api/employees', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM employees';
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (ex) {
        next(ex);
    }
});

// GET /api/departments - returns an array of departments
app.get('/api/departments', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM departments';
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (ex) {
        next(ex);
    }
});

// POST /api/employees - payload: the employee to create, returns the created employee
app.post('/api/employees', async (req, res, next) => {
    try {
        const SQL = 'INSERT INTO employees(name, department_id) VALUES($1, $2) RETURNING *';
        const response = await client.query(SQL, [req.body.name, req.body.department_id]);
        res.send(response.rows[0]);
    } catch (ex) {
        next(ex);
    }
});

// DELETE /api/employees/:id - the id of the employee to delete is passed in the URL, returns nothing
app.delete('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = 'DELETE FROM employees WHERE id=$1';
        await client.query(SQL, [req.params.id]);
        res.sendStatus(204);
    } catch (ex) {
        next(ex);
    }
});

// PUT /api/employees/:id - payload: the updated employee returns the updated employee
app.put('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = 'UPDATE employees SET name=$1, department_id=$2, updated_at=now() WHERE id=$3 RETURNING *';
        const response = await client.query(SQL, [req.body.name, req.body.department_id, req.params.id]);
        res.send(response.rows[0]);
    } catch (ex) {
        next(ex);
    }
});

// Error handling route
app.use((err, req, res, next) => {
    res.status(500).send({ error: err.message });
});

const init = async () => {
    await client.connect();
    try {
        await client.query(`
            DROP TABLE IF EXISTS employees;
            DROP TABLE IF EXISTS departments;
            CREATE TABLE departments(
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL
            );
            CREATE TABLE employees(
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now(),
                department_id INTEGER REFERENCES departments(id)
            );
        `);
        console.log('Tables created');

        // Seeding departments
        await client.query(`
            INSERT INTO departments(name) VALUES ('HR'), ('Engineering'), ('Sales');
        `);
        
        // Seeding employees with additional entries for Devin, Liz, and Cindy
        await client.query(`
            INSERT INTO employees(name, department_id) VALUES 
            ('Alice', 1), 
            ('Bob', 2), 
            ('Charlie', 3),
            ('Devin', 1), 
            ('Liz', 2), 
            ('Cindy', 3);
        `);
        console.log('Data seeded');
    } catch (ex) {
        console.log('Error initializing database', ex);
        process.exit(1);
    }

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Listening on port ${port}`));
};

init();
