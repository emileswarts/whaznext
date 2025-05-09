import mysql, {FieldPacket, RowDataPacket} from 'mysql2/promise';

import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

let connectionParams = {
host: 'db',
port: 3306,
user: 'root',
password: 'test',
database: 'mydb'
}

const connection = await mysql.createConnection(connectionParams)

interface IRevenue extends RowDataPacket {
  month: string;
  revenue: number;
}

export async function fetchRevenue(): Promise<Array<Revenue>> {
  try {
    console.log("Fetching Revenue data")
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const query = `SELECT * FROM revenue`
    const [rows]: [IRevenue[], FieldPacket[]] = await connection.query<IRevenue[]>(query, [])
    connection.end
    console.log('Data fetch completed after 3 seconds.');
    console.log(rows)

    return rows;

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch');
  }
}

interface IInvoice extends RowDataPacket {
  id: string;
  name: string;
  image_url: string;
  email: string;
  amount: string;
}

export async function fetchLatestInvoices(): Promise<Array<IInvoice>> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const query = `
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const [rows]: [IInvoice[], FieldPacket[]] = await connection.query(query)
    connection.end
    return rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch');
  }
}

 export async function fetchCardData() {
   try {
     // You can probably combine these into a single SQL query
     // However, we are intentionally splitting them to demonstrate
     // how to initialize multiple queries in parallel with JS.
     const connection = await mysql.createConnection(connectionParams)
     const invoiceCountPromise = connection.query("SELECT COUNT(*) as invoice_count FROM invoices")
     const customerCountPromise = connection.query("SELECT COUNT(*) as customer_count FROM customers")
     const invoiceStatusPromise = connection.query(`
       SELECT
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
          FROM invoices
     `)

     const data = await Promise.all([
       invoiceCountPromise,
       customerCountPromise,
       invoiceStatusPromise,
     ]);

     const numberOfInvoices = Number(data[0][0][0].invoice_count ?? '0');
     const numberOfCustomers = Number(data[1][0][0].customer_count ?? '0');
     const totalPaidInvoices = formatCurrency(data[2][0][0].paid ?? '0');
     const totalPendingInvoices = formatCurrency(data[2][0][0].pending ?? '0');

     connection.end
     return {
       numberOfCustomers,
       numberOfInvoices,
       totalPaidInvoices,
       totalPendingInvoices,
     };
   } catch (error) {
     console.error('Database Error:', error);
     throw new Error('Failed to fetch card data.');
   }
 }

interface IInvoicesTable extends RowDataPacket {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  image_url: string;
  date: string;
  amount: number;
  status: 'pending' | 'paid';
};

 const ITEMS_PER_PAGE = 6;
 export async function fetchFilteredInvoices(
   query: string,
   currentPage: number,
 ) {
   const offset = (currentPage - 1) * ITEMS_PER_PAGE;
   const connection = await mysql.createConnection(connectionParams)

   try {
     const my_query = `
       SELECT
         invoices.id,
         invoices.amount,
         invoices.date,
         invoices.status,
         customers.name,
         customers.email,
         customers.image_url
       FROM invoices
       JOIN customers ON invoices.customer_id = customers.id
       WHERE
         LOWER(customers.name) LIKE "${`%${query}%`}" OR
         LOWER(customers.email) LIKE "${`%${query}%`}" OR
         LOWER(invoices.amount) LIKE "${`%${query}%`}" OR
         LOWER(invoices.date) LIKE "${`%${query}%`}" OR
         LOWER(invoices.status) LIKE "${`%${query}%`}"
       ORDER BY invoices.date DESC
       LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
     `;

     const [rows]: [IInvoicesTable[], FieldPacket[]] = await connection.query<IInvoicesTable[]>(my_query, [])
     return rows;
   } catch (error) {
     console.error('Database Error:', error);
     throw new Error('Failed to fetch invoices.');
   }
 }

 export async function fetchInvoicesPages(query: string) {
   const connection = await mysql.createConnection(connectionParams)

   try {
     const data = await connection.query(`SELECT COUNT(*) as invoice_count
     FROM invoices
     JOIN customers ON invoices.customer_id = customers.id
     WHERE
       LOWER(customers.name) LIKE "${`%${query}%`}" OR
       LOWER(customers.email) LIKE "${`%${query}%`}" OR
       LOWER(invoices.amount) LIKE "${`%${query}%`}" OR
       LOWER(invoices.date) LIKE "${`%${query}%`}" OR
       LOWER(invoices.status) LIKE "${`%${query}%`}"
   `);

     console.log(data[0][0])
     const totalPages = Math.ceil(Number(data[0][0].invoice_count) / ITEMS_PER_PAGE);

     return totalPages;
   } catch (error) {
     console.error('Database Error:', error);
     throw new Error('Failed to fetch total number of invoices.');
   }
 }
 // 
 // export async function fetchInvoiceById(id: string) {
 //   try {
 //     const data = await sql<InvoiceForm[]>`
 //       SELECT
 //         invoices.id,
 //         invoices.customer_id,
 //         invoices.amount,
 //         invoices.status
 //       FROM invoices
 //       WHERE invoices.id = ${id};
 //     `;
 // 
 //     const invoice = data.map((invoice) => ({
 //       ...invoice,
 //       // Convert amount from cents to dollars
 //       amount: invoice.amount / 100,
 //     }));
 // 
 //     return invoice[0];
 //   } catch (error) {
 //     console.error('Database Error:', error);
 //     throw new Error('Failed to fetch invoice.');
 //   }
 // }
 // 
 // export async function fetchCustomers() {
 //   try {
 //     const customers = await sql<CustomerField[]>`
 //       SELECT
 //         id,
 //         name
 //       FROM customers
 //       ORDER BY name ASC
 //     `;
 // 
 //     return customers;
 //   } catch (err) {
 //     console.error('Database Error:', err);
 //     throw new Error('Failed to fetch all customers.');
 //   }
 // }
 // 
 // export async function fetchFilteredCustomers(query: string) {
 //   try {
 //     const data = await sql<CustomersTableType[]>`
 // 		SELECT
 // 		  customers.id,
 // 		  customers.name,
 // 		  customers.email,
 // 		  customers.image_url,
 // 		  COUNT(invoices.id) AS total_invoices,
 // 		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
 // 		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
 // 		FROM customers
 // 		LEFT JOIN invoices ON customers.id = invoices.customer_id
 // 		WHERE
 // 		  customers.name ILIKE ${`%${query}%`} OR
 //         customers.email ILIKE ${`%${query}%`}
 // 		GROUP BY customers.id, customers.name, customers.email, customers.image_url
 // 		ORDER BY customers.name ASC
 // 	  `;
 // 
 //     const customers = data.map((customer) => ({
 //       ...customer,
 //       total_pending: formatCurrency(customer.total_pending),
 //       total_paid: formatCurrency(customer.total_paid),
 //     }));
 // 
 //     return customers;
 //   } catch (err) {
 //     console.error('Database Error:', err);
 //     throw new Error('Failed to fetch customer table.');
 //   }
 // }
 // 