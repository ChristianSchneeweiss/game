-- Item foundation: preserve individual equipment and add account-owned stacks.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE "item_stack" (
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "quantity" integer NOT NULL,
  CONSTRAINT "item_stack_user_id_type_pk" PRIMARY KEY ("user_id", "type"),
  CONSTRAINT "item_stack_positive_quantity" CHECK ("quantity" > 0)
);
ALTER TABLE "item_stack" ADD CONSTRAINT "item_stack_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
COMMIT;
