import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL no está configurada en el archivo .env");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@stockprogt.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@stockprogt.com",
      password: "admin123",
      role: "ADMIN",
    },
  });

  const categorias = [
    "Repuestos",
    "Ferretería",
    "Farmacia",
    "Tienda",
  ];

  for (const name of categorias) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: "Proveedor de prueba",
      phone: "5555-5555",
      email: "proveedor@demo.com",
      address: "Guatemala",
    },
  });

  const category = await prisma.category.findUnique({
    where: { name: "Repuestos" },
  });

  await prisma.product.create({
    data: {
      code: "PROD-001",
      name: "Filtro de aceite demo",
      description: "Producto de ejemplo para pruebas del sistema",
      brand: "Demo",
      priceCost: 25,
      priceSale: 45,
      stock: 20,
      minStock: 5,
      categoryId: category?.id,
      supplierId: supplier.id,
    },
  });

  console.log("Datos iniciales creados correctamente.");
  console.log("Usuario:", admin.email);
  console.log("Contraseña: admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });