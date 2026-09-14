-- CreateTable: audit trail for per-connection billing operations
CREATE TABLE "connection_billings" (
    "id"                       TEXT    NOT NULL,
    "connection_id"            TEXT    NOT NULL,
    "agency_id"                TEXT    NOT NULL,
    "operation_type"           TEXT    NOT NULL,
    "stripe_invoice_id"        TEXT,
    "stripe_payment_intent_id" TEXT,
    "amount"                   INTEGER NOT NULL,
    "currency"                 TEXT    NOT NULL DEFAULT 'eur',
    "status"                   TEXT    NOT NULL,
    "activation_charged_at"    TIMESTAMP(3),
    "paid_through"             TIMESTAMP(3),
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_billings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: DB-level idempotency — one activation per connection
CREATE UNIQUE INDEX "connection_billings_connection_id_operation_type_key"
    ON "connection_billings"("connection_id", "operation_type");

-- CreateIndex
CREATE UNIQUE INDEX "connection_billings_stripe_invoice_id_key"
    ON "connection_billings"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "connection_billings_agency_id_idx"
    ON "connection_billings"("agency_id");

-- AddForeignKey
ALTER TABLE "connection_billings"
    ADD CONSTRAINT "connection_billings_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_billings"
    ADD CONSTRAINT "connection_billings_agency_id_fkey"
    FOREIGN KEY ("agency_id") REFERENCES "agencies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
