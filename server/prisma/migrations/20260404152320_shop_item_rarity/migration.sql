-- CreateEnum
CREATE TYPE "ShopItemRarity" AS ENUM ('restricted', 'classified', 'covert', 'contraband', 'immortal', 'arcana');

-- AlterTable
ALTER TABLE "shop_items" ADD COLUMN     "rarity" "ShopItemRarity" NOT NULL DEFAULT 'restricted';
