import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncSchema1780791497410 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Users tipo enum: migrate from ('admin','user','operator') to ('admin','usuario','caja')
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tipo" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tipo" TYPE text USING "tipo"::text`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_tipo_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_tipo_enum" AS ENUM('admin', 'usuario', 'caja')`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "tipo" = 'usuario' WHERE "tipo" = 'user'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "tipo" = 'caja' WHERE "tipo" = 'operator'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tipo" TYPE "public"."users_tipo_enum" USING "tipo"::"public"."users_tipo_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tipo" SET DEFAULT 'usuario'`,
    );

    // 2. Add RFC_FISICA, RFC_MORAL to documentos_cliente_tipodocumento_enum
    await queryRunner.query(
      `ALTER TYPE "public"."documentos_cliente_tipodocumento_enum" ADD VALUE IF NOT EXISTS 'RFC_FISICA'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."documentos_cliente_tipodocumento_enum" ADD VALUE IF NOT EXISTS 'RFC_MORAL'`,
    );

    // 3. Add '7' to inventario_almacen_almacentipo_enum
    await queryRunner.query(
      `ALTER TYPE "public"."inventario_almacen_almacentipo_enum" ADD VALUE IF NOT EXISTS '7'`,
    );

    // 4. Add '7' to movimientos_almacen_almacenorigen_enum
    await queryRunner.query(
      `ALTER TYPE "public"."movimientos_almacen_almacenorigen_enum" ADD VALUE IF NOT EXISTS '7'`,
    );

    // 5. Add '7' to movimientos_almacen_almacendestino_enum
    await queryRunner.query(
      `ALTER TYPE "public"."movimientos_almacen_almacendestino_enum" ADD VALUE IF NOT EXISTS '7'`,
    );

    // 6. Expand forma_pago to include all SAT formapago values
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '02'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '05'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '06'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '08'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '12'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '13'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '14'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '15'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '17'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '18'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '19'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '20'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '21'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '23'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '24'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '25'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '26'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '27'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '28'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '30'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '31'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."forma_pago" ADD VALUE IF NOT EXISTS '99'`,
    );

    // 7. Create movimientos_credito table
    await queryRunner.query(
      `CREATE TYPE "public"."movimientos_credito_tipo_enum" AS ENUM('CREACION', 'ACTUALIZACION', 'USO')`,
    );
    await queryRunner.query(`CREATE TABLE "movimientos_credito" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "clienteid" uuid NOT NULL,
            "usuarioid" uuid,
            "tipo" "public"."movimientos_credito_tipo_enum" NOT NULL,
            "limiteanterior" numeric(12,2),
            "limitenuevo" numeric(12,2),
            "saldoactualanterior" numeric(12,2),
            "saldoactualnuevo" numeric(12,2),
            "observaciones" text,
            "createdat" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_movimientos_credito" PRIMARY KEY ("id")
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_credito"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."movimientos_credito_tipo_enum"`,
    );

    // Revert users_tipo_enum
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tipo" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tipo" TYPE text USING "tipo"::text`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_tipo_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_tipo_enum" AS ENUM('admin', 'user', 'operator')`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "tipo" = 'user' WHERE "tipo" = 'usuario'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "tipo" = 'operator' WHERE "tipo" = 'caja'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tipo" TYPE "public"."users_tipo_enum" USING "tipo"::"public"."users_tipo_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "tipo" SET DEFAULT 'user'`,
    );
  }
}
