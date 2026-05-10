import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export interface TestAttributes {
  id?: number;
  testName: string;
  units: string;
  minLimit: number;
  maxLimit: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Test extends Model<TestAttributes> implements TestAttributes {
  declare id: number;
  declare testName: string;
  declare units: string;
  declare minLimit: number;
  declare maxLimit: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Test.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    testName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    units: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    minLimit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    maxLimit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'Tests',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['testName', 'units', 'minLimit', 'maxLimit'],
      },
    ],
  }
);

export default Test;
