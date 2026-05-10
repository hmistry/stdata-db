import { Sequelize } from 'sequelize';
import path from 'path';
import sqlite3 from 'sqlite3';

const dbPath = path.resolve('data/test.db');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  dialectModule: sqlite3,
  logging: false, // Set to console.log for SQL query debugging
});

export default sequelize;
