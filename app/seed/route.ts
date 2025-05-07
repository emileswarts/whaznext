import bcrypt from 'bcryptjs';
import mysql from  'mysql2/promise';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';
import {Revenue} from "@/app/lib/definitions";

let connectionParams = {
  host: 'db',
  user: 'root',
  password: 'test',
  database: 'mydb'
}

async function seedUsers() {
  console.log("we are starting")
  const connection = await mysql.createConnection(connectionParams)

    console.log("connection established")
    const query_drop = `DROP TABLE IF EXISTS users;`;
    await connection.execute(query_drop)

  const query_create = `
    CREATE TABLE users (
      id VARCHAR(255) DEFAULT (UUID()) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );
  `;
  await connection.execute(query_create)

    console.log("table created")
  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const users_query = 'INSERT INTO `users`(`name`, `email`, `password`) VALUES (?, ?, ?)';
      await connection.query(users_query, [user.name, user.email, hashedPassword])
    }),
  );

  connection.end()
  return insertedUsers;
}

async function seedInvoices() {
  const connection = await mysql.createConnection(connectionParams)

  const query_drop = `DROP TABLE IF EXISTS invoices;`;
  const query_create = `
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(255) DEFAULT (UUID()) PRIMARY KEY,
      customer_id VARCHAR(255) DEFAULT(UUID()) NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  await connection.query(query_drop)
  await connection.query(query_create)
  const insertedInvoices = await Promise.all(
    invoices.map( async (invoice) => {
        const query = 'INSERT INTO invoices (customer_id, amount, status, date) VALUES (?, ?, ?, ?)'
        await connection.query(query, [invoice.customer_id, invoice.amount, invoice.status, invoice.date])
      },
    ),
  );

  return insertedInvoices;
}

async function seedCustomers() {
  const connection = await mysql.createConnection(connectionParams)

  const create_query = `
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(255) DEFAULT (UUID()) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  await connection.query(create_query)

  const insertedCustomers = await Promise.all(
    customers.map( async (customer) => {
      const create_query = `INSERT INTO customers (id, name, email, image_url)
                            VALUES (?, ?, ?, ?)`;

      connection.query(create_query, [customer.id, customer.name, customer.email, customer.image_url])
    }
  )
)

  return insertedCustomers;
}

async function seedRevenue() {
  const connection = await mysql.createConnection(connectionParams)

  const query_drop = `DROP TABLE IF EXISTS revenue;`;
  await connection.execute(query_drop)

  const query_create = `
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;
  await connection.execute(query_create)

  const insertedRevenue = await Promise.all(
  revenue.map(async (rev) => {
        const revenue_query = 'INSERT INTO `revenue` (`month`, `revenue`) VALUES (?, ?)';
        const values =  [ rev.month, rev.revenue ]
        await connection.query(revenue_query, values)
      }),
  );

  connection.end()
  return insertedRevenue;
}

export async function GET() {
  try {
    seedUsers()
    seedCustomers()
    seedInvoices()
    seedRevenue()

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
