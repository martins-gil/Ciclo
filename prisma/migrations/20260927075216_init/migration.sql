-- CreateEnum
CREATE TYPE "PotKind" AS ENUM ('spending', 'goal', 'buffer');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('spend', 'transfer', 'reimbursement_pending', 'reimbursement_received', 'income');

-- CreateTable
CREATE TABLE "envelopes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyCap" DOUBLE PRECISION NOT NULL,
    "passthrough" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pots" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PotKind" NOT NULL,
    "target" DOUBLE PRECISION,
    "order" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "envelopeId" INTEGER,
    "potId" INTEGER,
    "toPotId" INTEGER,
    "isBaseIncome" BOOLEAN,
    "linkedTransactionId" INTEGER,
    "createdAt" BIGINT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "cycleStartDay" INTEGER NOT NULL DEFAULT 21,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "locale" TEXT NOT NULL DEFAULT 'pt-PT',
    "baseIncomeDefault" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "envelopes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_potId_fkey" FOREIGN KEY ("potId") REFERENCES "pots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_toPotId_fkey" FOREIGN KEY ("toPotId") REFERENCES "pots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
