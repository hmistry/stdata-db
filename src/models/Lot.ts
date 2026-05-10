import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db.js';

export interface LotAttributes {
  id?: number;
  lotNumber: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Lot extends Model<LotAttributes> implements LotAttributes {
  declare id: number;
  declare lotNumber: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Lot.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lotNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: 'Lots',
    timestamps: true,
  }
);

export default Lot;
