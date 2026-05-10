import { DataTypes, Model, ForeignKey } from 'sequelize';
import { sequelize } from '../db.js';
import Lot from './Lot.js';
import Test from './Test.js';

export interface TestResultAttributes {
  id?: number;
  lotId: ForeignKey<number>;
  testId: ForeignKey<number>;
  temperature: number;
  value: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TestResult extends Model<TestResultAttributes> implements TestResultAttributes {
  declare id: number;
  declare lotId: ForeignKey<number>;
  declare testId: ForeignKey<number>;
  declare temperature: number;
  declare value: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association properties
  declare Lot?: Lot;
  declare Test?: Test;
}

TestResult.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lotId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Lot,
        key: 'id',
      },
    },
    testId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Test,
        key: 'id',
      },
    },
    temperature: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'TestResults',
    timestamps: true,
  }
);

// Set up associations
TestResult.belongsTo(Lot, { foreignKey: 'lotId' });
TestResult.belongsTo(Test, { foreignKey: 'testId' });
Lot.hasMany(TestResult, { foreignKey: 'lotId' });
Test.hasMany(TestResult, { foreignKey: 'testId' });

export default TestResult;
