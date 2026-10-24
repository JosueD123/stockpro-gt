"use client";

import {
  Boxes,
  Download,
  FileSpreadsheet,
  FileText,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type ProductExport = {
  code: string;
  name: string;
  brand: string | null;
  category: string | null;
  supplier: string | null;
  stock: number;
  minStock: number;
  priceCost: number;
  priceSale: number;
};

type SaleItemExport = {
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
};

type SaleExport = {
  id: number;
  createdAt: string;
  customer: string;
  total: number;
  items: SaleItemExport[];
};

type PurchaseItemExport = {
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

type PurchaseExport = {
  id: number;
  purchaseNumber: string;
  purchaseDate: string;
  supplier: string;
  status: string;
  notes: string | null;
  total: number;
  items: PurchaseItemExport[];
};

type ReceivableExport = {
  id: number;
  saleId: number;
  customer: string;
  createdAt: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
};

type Props = {
  products: ProductExport[];
  sales: SaleExport[];
  purchases: PurchaseExport[];
  receivables?: ReceivableExport[];
  businessName: string;
  currency: string;
};

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function getCurrentDateForFile() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-GT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(
  value: number,
  currency: string
) {
  const symbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : "Q";

  return `${symbol}${value.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPurchaseStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return "Completada";

    case "PENDING":
      return "Pendiente";

    case "CANCELLED":
      return "Cancelada";

    default:
      return status;
  }
}

function getProductStatus(product: ProductExport) {
  if (product.stock === 0) {
    return "Agotado";
  }

  if (product.stock <= product.minStock) {
    return "Stock bajo";
  }

  return "Disponible";
}

function formatReceivableStatus(
  status: string,
  dueDate: string
) {
  if (
    status !== "PAID" &&
    new Date(dueDate) < new Date()
  ) {
    return "Vencida";
  }

  if (status === "PAID") {
    return "Pagada";
  }

  if (status === "PARTIAL") {
    return "Parcial";
  }

  return "Pendiente";
}

function addWorksheet(
  workbook: XLSX.WorkBook,
  data: Record<string, string | number>[],
  sheetName: string,
  columnWidths: number[]
) {
  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = columnWidths.map((width) => ({
    wch: width,
  }));

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName
  );

  return worksheet;
}

export default function ReportExportButtons({
  products,
  sales,
  purchases,
  receivables = [],
  businessName,
  currency,
}: Props) {
  const safeBusinessName =
    sanitizeFileName(businessName) || "ControlStock_Pro";

  const currentDate = getCurrentDateForFile();

  /*
   * ==========================================
   * EXPORTAR INVENTARIO A EXCEL
   * ==========================================
   */

  function exportInventory() {
    const workbook = XLSX.utils.book_new();

    const totalCost = products.reduce(
      (accumulator, product) =>
        accumulator + product.stock * product.priceCost,
      0
    );

    const totalSaleValue = products.reduce(
      (accumulator, product) =>
        accumulator + product.stock * product.priceSale,
      0
    );

    const lowStock = products.filter(
      (product) =>
        product.stock <= product.minStock
    ).length;

    const outOfStock = products.filter(
      (product) => product.stock === 0
    ).length;

    const summaryData = [
      {
        Indicador: "Empresa",
        Valor: businessName,
      },
      {
        Indicador: "Fecha de generación",
        Valor: new Date().toLocaleString("es-GT"),
      },
      {
        Indicador: "Moneda",
        Valor: currency,
      },
      {
        Indicador: "Productos registrados",
        Valor: products.length,
      },
      {
        Indicador: "Productos con stock crítico",
        Valor: lowStock,
      },
      {
        Indicador: "Productos agotados",
        Valor: outOfStock,
      },
      {
        Indicador: "Costo total del inventario",
        Valor: totalCost,
      },
      {
        Indicador: "Valor estimado de venta",
        Valor: totalSaleValue,
      },
      {
        Indicador: "Ganancia potencial",
        Valor: totalSaleValue - totalCost,
      },
    ];

    addWorksheet(
      workbook,
      summaryData,
      "Resumen",
      [32, 30]
    );

    const inventoryData = products.map((product) => {
      const inventoryCost =
        product.stock * product.priceCost;

      const inventorySaleValue =
        product.stock * product.priceSale;

      return {
        Código: product.code,
        Producto: product.name,
        Marca: product.brand || "Sin marca",
        Categoría:
          product.category || "Sin categoría",
        Proveedor:
          product.supplier || "Sin proveedor",
        Estado: getProductStatus(product),
        Stock: product.stock,
        "Stock mínimo": product.minStock,
        "Precio costo": product.priceCost,
        "Precio venta": product.priceSale,
        "Costo inventario": inventoryCost,
        "Valor de venta": inventorySaleValue,
        "Ganancia potencial":
          inventorySaleValue - inventoryCost,
      };
    });

    addWorksheet(
      workbook,
      inventoryData,
      "Inventario",
      [
        16,
        34,
        22,
        24,
        28,
        16,
        12,
        14,
        16,
        16,
        19,
        19,
        20,
      ]
    );

    XLSX.writeFile(
      workbook,
      `${safeBusinessName}_Inventario_${currentDate}.xlsx`
    );
  }

  /*
   * ==========================================
   * EXPORTAR INVENTARIO A PDF
   * ==========================================
   */

  function exportInventoryPdf() {
    if (products.length === 0) {
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const totalCost = products.reduce(
      (accumulator, product) =>
        accumulator + product.stock * product.priceCost,
      0
    );

    const totalSaleValue = products.reduce(
      (accumulator, product) =>
        accumulator + product.stock * product.priceSale,
      0
    );

    const lowStock = products.filter(
      (product) =>
        product.stock <= product.minStock
    ).length;

    const outOfStock = products.filter(
      (product) => product.stock === 0
    ).length;

    /*
     * ENCABEZADO
     */

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);

    doc.text(
      businessName,
      14,
      15
    );

    doc.setFontSize(13);

    doc.text(
      "Reporte de inventario",
      14,
      24
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      203,
      213,
      225
    );

    doc.text(
      `Generado: ${new Date().toLocaleString("es-GT")}`,
      14,
      31
    );

    doc.text(
      `Moneda: ${currency}`,
      pageWidth - 14,
      31,
      {
        align: "right",
      }
    );

    /*
     * RESUMEN
     */

    doc.setTextColor(
      15,
      23,
      42
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Resumen",
      14,
      49
    );

    const summaryY = 55;

    const cardWidth =
      (pageWidth - 28 - 9) / 4;

    const cardHeight = 22;

    const summaryCards = [
      {
        label: "Productos",
        value:
          products.length.toLocaleString(
            "es-GT"
          ),
      },
      {
        label: "Stock crítico",
        value:
          lowStock.toLocaleString(
            "es-GT"
          ),
      },
      {
        label: "Costo inventario",
        value: formatCurrency(
          totalCost,
          currency
        ),
      },
      {
        label: "Valor de venta",
        value: formatCurrency(
          totalSaleValue,
          currency
        ),
      },
    ];

    summaryCards.forEach(
      (card, index) => {
        const x =
          14 +
          index *
            (cardWidth + 3);

        doc.setFillColor(
          248,
          250,
          252
        );

        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.roundedRect(
          x,
          summaryY,
          cardWidth,
          cardHeight,
          2,
          2,
          "FD"
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          card.label,
          x + 4,
          summaryY + 7
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(12);

        doc.setTextColor(
          15,
          23,
          42
        );

        doc.text(
          card.value,
          x + 4,
          summaryY + 16
        );
      }
    );

    /*
     * INFORMACIÓN COMPLEMENTARIA
     */

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);

    doc.setTextColor(
      100,
      116,
      139
    );

    doc.text(
      `Productos agotados: ${outOfStock}  |  Ganancia potencial estimada: ${formatCurrency(
        totalSaleValue - totalCost,
        currency
      )}`,
      14,
      82
    );

    /*
     * TABLA
     */

    const inventoryTableBody =
      products.map(
        (product) => [
          product.code,
          product.name,
          product.category ||
            "Sin categoría",
          product.supplier ||
            "Sin proveedor",
          getProductStatus(
            product
          ),
          String(
            product.stock
          ),
          String(
            product.minStock
          ),
          formatCurrency(
            product.priceCost,
            currency
          ),
          formatCurrency(
            product.priceSale,
            currency
          ),
          formatCurrency(
            product.stock *
              product.priceCost,
            currency
          ),
        ]
      );

    autoTable(doc, {
      startY: 87,

      head: [
        [
          "Código",
          "Producto",
          "Categoría",
          "Proveedor",
          "Estado",
          "Stock",
          "Mín.",
          "Costo",
          "Venta",
          "Valor costo",
        ],
      ],

      body: inventoryTableBody,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 7.3,
        cellPadding: 2.4,
        textColor: [
          30,
          41,
          59,
        ],
        lineColor: [
          226,
          232,
          240,
        ],
        lineWidth: 0.2,
        valign: "middle",
      },

      headStyles: {
        fillColor: [
          15,
          23,
          42,
        ],
        textColor: [
          255,
          255,
          255,
        ],
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: [
          248,
          250,
          252,
        ],
      },

      columnStyles: {
        0: {
          cellWidth: 22,
        },

        1: {
          cellWidth: 45,
        },

        2: {
          cellWidth: 32,
        },

        3: {
          cellWidth: 36,
        },

        4: {
          cellWidth: 24,
          halign: "center",
        },

        5: {
          cellWidth: 16,
          halign: "center",
        },

        6: {
          cellWidth: 16,
          halign: "center",
        },

        7: {
          cellWidth: 24,
          halign: "right",
        },

        8: {
          cellWidth: 24,
          halign: "right",
        },

        9: {
          cellWidth: 28,
          halign: "right",
        },
      },

      margin: {
        left: 14,
        right: 14,
        bottom: 18,
      },

      didDrawPage: () => {
        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.line(
          14,
          pageHeight - 13,
          pageWidth - 14,
          pageHeight - 13
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          `${businessName} - ControlStock Pro`,
          14,
          pageHeight - 7
        );
      },
    });

    /*
     * NUMERACIÓN
     */

    const pageCount =
      doc.getNumberOfPages();

    for (
      let pageNumber = 1;
      pageNumber <= pageCount;
      pageNumber++
    ) {
      doc.setPage(
        pageNumber
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        100,
        116,
        139
      );

      doc.text(
        `Página ${pageNumber} de ${pageCount}`,
        pageWidth - 14,
        pageHeight - 7,
        {
          align: "right",
        }
      );
    }

    doc.save(
      `${safeBusinessName}_Reporte_Inventario_${currentDate}.pdf`
    );
  }

  /*
   * ==========================================
   * EXPORTAR VENTAS A EXCEL
   * ==========================================
   */

  function exportSales() {
    const workbook = XLSX.utils.book_new();

    const totalSales = sales.reduce(
      (accumulator, sale) =>
        accumulator + sale.total,
      0
    );

    const totalUnits = sales.reduce(
      (saleAccumulator, sale) =>
        saleAccumulator +
        sale.items.reduce(
          (itemAccumulator, item) =>
            itemAccumulator + item.quantity,
          0
        ),
      0
    );

    const averageTicket =
      sales.length > 0
        ? totalSales / sales.length
        : 0;

    const summaryData = [
      {
        Indicador: "Empresa",
        Valor: businessName,
      },
      {
        Indicador: "Fecha de generación",
        Valor: new Date().toLocaleString("es-GT"),
      },
      {
        Indicador: "Moneda",
        Valor: currency,
      },
      {
        Indicador: "Ventas registradas",
        Valor: sales.length,
      },
      {
        Indicador: "Unidades vendidas",
        Valor: totalUnits,
      },
      {
        Indicador: "Total vendido",
        Valor: totalSales,
      },
      {
        Indicador: "Ticket promedio",
        Valor: averageTicket,
      },
    ];

    addWorksheet(
      workbook,
      summaryData,
      "Resumen",
      [30, 32]
    );

    const salesData = sales.map((sale) => {
      const totalQuantity = sale.items.reduce(
        (accumulator, item) =>
          accumulator + item.quantity,
        0
      );

      return {
        Venta: `#${sale.id}`,
        Fecha: formatDate(sale.createdAt),
        Cliente: sale.customer,
        "Líneas de producto": sale.items.length,
        "Unidades vendidas": totalQuantity,
        Total: sale.total,
      };
    });

    addWorksheet(
      workbook,
      salesData,
      "Ventas",
      [14, 23, 32, 20, 20, 18]
    );

    const salesDetailData = sales.flatMap(
      (sale) =>
        sale.items.map((item) => ({
          Venta: `#${sale.id}`,
          Fecha: formatDate(sale.createdAt),
          Cliente: sale.customer,
          Código: item.productCode,
          Producto: item.productName,
          Cantidad: item.quantity,
          "Precio unitario": item.price,
          Subtotal: item.quantity * item.price,
        }))
    );

    addWorksheet(
      workbook,
      salesDetailData,
      "Detalle ventas",
      [
        14,
        23,
        30,
        16,
        34,
        12,
        18,
        18,
      ]
    );

    XLSX.writeFile(
      workbook,
      `${safeBusinessName}_Ventas_${currentDate}.xlsx`
    );
  }

  /*
   * ==========================================
   * EXPORTAR VENTAS A PDF
   * ==========================================
   */

  function exportSalesPdf() {
    if (sales.length === 0) {
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const totalSales = sales.reduce(
      (accumulator, sale) =>
        accumulator + sale.total,
      0
    );

    const totalUnits = sales.reduce(
      (saleAccumulator, sale) =>
        saleAccumulator +
        sale.items.reduce(
          (itemAccumulator, item) =>
            itemAccumulator + item.quantity,
          0
        ),
      0
    );

    const averageTicket =
      sales.length > 0
        ? totalSales / sales.length
        : 0;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);

    doc.text(
      businessName,
      14,
      15
    );

    doc.setFontSize(13);

    doc.text(
      "Reporte de ventas",
      14,
      24
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      203,
      213,
      225
    );

    doc.text(
      `Generado: ${new Date().toLocaleString("es-GT")}`,
      14,
      31
    );

    doc.text(
      `Moneda: ${currency}`,
      pageWidth - 14,
      31,
      {
        align: "right",
      }
    );

    doc.setTextColor(
      15,
      23,
      42
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Resumen",
      14,
      49
    );

    const summaryY = 55;

    const cardWidth =
      (pageWidth - 28 - 9) / 4;

    const cardHeight = 22;

    const summaryCards = [
      {
        label: "Ventas registradas",
        value:
          sales.length.toLocaleString(
            "es-GT"
          ),
      },
      {
        label: "Unidades vendidas",
        value:
          totalUnits.toLocaleString(
            "es-GT"
          ),
      },
      {
        label: "Total vendido",
        value: formatCurrency(
          totalSales,
          currency
        ),
      },
      {
        label: "Ticket promedio",
        value: formatCurrency(
          averageTicket,
          currency
        ),
      },
    ];

    summaryCards.forEach(
      (card, index) => {
        const x =
          14 +
          index *
            (cardWidth + 3);

        doc.setFillColor(
          248,
          250,
          252
        );

        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.roundedRect(
          x,
          summaryY,
          cardWidth,
          cardHeight,
          2,
          2,
          "FD"
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          card.label,
          x + 4,
          summaryY + 7
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(12);

        doc.setTextColor(
          15,
          23,
          42
        );

        doc.text(
          card.value,
          x + 4,
          summaryY + 16
        );
      }
    );

    const salesTableBody =
      sales.map((sale) => {
        const units =
          sale.items.reduce(
            (
              accumulator,
              item
            ) =>
              accumulator +
              item.quantity,
            0
          );

        return [
          `#${sale.id}`,
          formatDate(
            sale.createdAt
          ),
          sale.customer,
          String(
            sale.items.length
          ),
          String(units),
          formatCurrency(
            sale.total,
            currency
          ),
        ];
      });

    autoTable(doc, {
      startY: 84,

      head: [
        [
          "Venta",
          "Fecha",
          "Cliente",
          "Productos",
          "Unidades",
          "Total",
        ],
      ],

      body: salesTableBody,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3,
        textColor: [
          30,
          41,
          59,
        ],
        lineColor: [
          226,
          232,
          240,
        ],
        lineWidth: 0.2,
        valign: "middle",
      },

      headStyles: {
        fillColor: [
          15,
          23,
          42,
        ],
        textColor: [
          255,
          255,
          255,
        ],
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: [
          248,
          250,
          252,
        ],
      },

      columnStyles: {
        0: {
          cellWidth: 20,
        },

        1: {
          cellWidth: 42,
        },

        2: {
          cellWidth: 85,
        },

        3: {
          halign: "center",
          cellWidth: 30,
        },

        4: {
          halign: "center",
          cellWidth: 30,
        },

        5: {
          halign: "right",
          cellWidth: 40,
        },
      },

      margin: {
        left: 14,
        right: 14,
        bottom: 18,
      },

      didDrawPage: () => {
        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.line(
          14,
          pageHeight - 13,
          pageWidth - 14,
          pageHeight - 13
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          `${businessName} - ControlStock Pro`,
          14,
          pageHeight - 7
        );
      },
    });

    const pageCount =
      doc.getNumberOfPages();

    for (
      let pageNumber = 1;
      pageNumber <= pageCount;
      pageNumber++
    ) {
      doc.setPage(
        pageNumber
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        100,
        116,
        139
      );

      doc.text(
        `Página ${pageNumber} de ${pageCount}`,
        pageWidth - 14,
        pageHeight - 7,
        {
          align: "right",
        }
      );
    }

    doc.save(
      `${safeBusinessName}_Reporte_Ventas_${currentDate}.pdf`
    );
  }

  /*
   * ==========================================
   * EXPORTAR CUENTAS POR COBRAR A EXCEL
   * ==========================================
   */

  function exportReceivables() {
    const workbook = XLSX.utils.book_new();

    const totalOriginal =
      receivables.reduce(
        (accumulator, account) =>
          accumulator + account.originalAmount,
        0
      );

    const totalPaid =
      receivables.reduce(
        (accumulator, account) =>
          accumulator + account.paidAmount,
        0
      );

    const totalBalance =
      receivables.reduce(
        (accumulator, account) =>
          accumulator + account.balance,
        0
      );

    const overdueCount =
      receivables.filter(
        (account) =>
          formatReceivableStatus(
            account.status,
            account.dueDate
          ) === "Vencida"
      ).length;

    const summaryData = [
      {
        Indicador: "Empresa",
        Valor: businessName,
      },
      {
        Indicador: "Fecha de generación",
        Valor: new Date().toLocaleString("es-GT"),
      },
      {
        Indicador: "Moneda",
        Valor: currency,
      },
      {
        Indicador: "Cuentas registradas",
        Valor: receivables.length,
      },
      {
        Indicador: "Total original",
        Valor: totalOriginal,
      },
      {
        Indicador: "Total abonado",
        Valor: totalPaid,
      },
      {
        Indicador: "Saldo pendiente",
        Valor: totalBalance,
      },
      {
        Indicador: "Cuentas vencidas",
        Valor: overdueCount,
      },
    ];

    addWorksheet(
      workbook,
      summaryData,
      "Resumen",
      [32, 32]
    );

    const receivablesData =
      receivables.map((account) => ({
        Cliente: account.customer,
        Venta: `#${account.saleId}`,
        Fecha: formatDate(account.createdAt),
        Vencimiento: formatDate(account.dueDate),
        Total: account.originalAmount,
        Abonado: account.paidAmount,
        Saldo: account.balance,
        Estado: formatReceivableStatus(
          account.status,
          account.dueDate
        ),
      }));

    addWorksheet(
      workbook,
      receivablesData,
      "Cuentas por cobrar",
      [32, 14, 23, 23, 18, 18, 18, 18]
    );

    XLSX.writeFile(
      workbook,
      `${safeBusinessName}_Cuentas_por_Cobrar_${currentDate}.xlsx`
    );
  }

  /*
   * ==========================================
   * EXPORTAR CUENTAS POR COBRAR A PDF
   * ==========================================
   */

  function exportReceivablesPdf() {
    if (receivables.length === 0) {
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const totalOriginal =
      receivables.reduce(
        (accumulator, account) =>
          accumulator + account.originalAmount,
        0
      );

    const totalPaid =
      receivables.reduce(
        (accumulator, account) =>
          accumulator + account.paidAmount,
        0
      );

    const totalBalance =
      receivables.reduce(
        (accumulator, account) =>
          accumulator + account.balance,
        0
      );

    const overdueCount =
      receivables.filter(
        (account) =>
          formatReceivableStatus(
            account.status,
            account.dueDate
          ) === "Vencida"
      ).length;

    doc.setFillColor(15, 23, 42);
    doc.rect(
      0,
      0,
      pageWidth,
      38,
      "F"
    );

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);

    doc.text(
      businessName,
      14,
      15
    );

    doc.setFontSize(13);

    doc.text(
      "Reporte de cuentas por cobrar",
      14,
      24
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      203,
      213,
      225
    );

    doc.text(
      `Generado: ${new Date().toLocaleString("es-GT")}`,
      14,
      31
    );

    doc.text(
      `Moneda: ${currency}`,
      pageWidth - 14,
      31,
      {
        align: "right",
      }
    );

    doc.setTextColor(
      15,
      23,
      42
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Resumen",
      14,
      49
    );

    const summaryY = 55;
    const cardWidth =
      (pageWidth - 28 - 9) / 4;
    const cardHeight = 22;

    const summaryCards = [
      {
        label: "Cuentas pendientes",
        value:
          receivables.length.toLocaleString(
            "es-GT"
          ),
      },
      {
        label: "Saldo pendiente",
        value: formatCurrency(
          totalBalance,
          currency
        ),
      },
      {
        label: "Total abonado",
        value: formatCurrency(
          totalPaid,
          currency
        ),
      },
      {
        label: "Cuentas vencidas",
        value:
          overdueCount.toLocaleString(
            "es-GT"
          ),
      },
    ];

    summaryCards.forEach(
      (card, index) => {
        const x =
          14 +
          index *
            (cardWidth + 3);

        doc.setFillColor(
          248,
          250,
          252
        );

        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.roundedRect(
          x,
          summaryY,
          cardWidth,
          cardHeight,
          2,
          2,
          "FD"
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          card.label,
          x + 4,
          summaryY + 7
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(12);

        doc.setTextColor(
          15,
          23,
          42
        );

        doc.text(
          card.value,
          x + 4,
          summaryY + 16
        );
      }
    );

    const receivablesTableBody =
      receivables.map(
        (account) => [
          account.customer,
          `#${account.saleId}`,
          formatDate(
            account.createdAt
          ),
          formatDate(
            account.dueDate
          ),
          formatCurrency(
            account.originalAmount,
            currency
          ),
          formatCurrency(
            account.paidAmount,
            currency
          ),
          formatCurrency(
            account.balance,
            currency
          ),
          formatReceivableStatus(
            account.status,
            account.dueDate
          ),
        ]
      );

    autoTable(doc, {
      startY: 84,

      head: [
        [
          "Cliente",
          "Venta",
          "Fecha",
          "Vencimiento",
          "Total",
          "Abonado",
          "Saldo",
          "Estado",
        ],
      ],

      body:
        receivablesTableBody,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: [
          30,
          41,
          59,
        ],
        lineColor: [
          226,
          232,
          240,
        ],
        lineWidth: 0.2,
        valign: "middle",
      },

      headStyles: {
        fillColor: [
          15,
          23,
          42,
        ],
        textColor: [
          255,
          255,
          255,
        ],
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: [
          248,
          250,
          252,
        ],
      },

      columnStyles: {
        0: {
          cellWidth: 55,
        },
        1: {
          cellWidth: 18,
          halign: "center",
        },
        2: {
          cellWidth: 32,
        },
        3: {
          cellWidth: 32,
        },
        4: {
          cellWidth: 29,
          halign: "right",
        },
        5: {
          cellWidth: 29,
          halign: "right",
        },
        6: {
          cellWidth: 29,
          halign: "right",
        },
        7: {
          cellWidth: 27,
          halign: "center",
        },
      },

      margin: {
        left: 14,
        right: 14,
        bottom: 18,
      },

      didDrawPage: () => {
        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.line(
          14,
          pageHeight - 13,
          pageWidth - 14,
          pageHeight - 13
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          `${businessName} - ControlStock Pro`,
          14,
          pageHeight - 7
        );
      },
    });

    const pageCount =
      doc.getNumberOfPages();

    for (
      let pageNumber = 1;
      pageNumber <= pageCount;
      pageNumber++
    ) {
      doc.setPage(
        pageNumber
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        100,
        116,
        139
      );

      doc.text(
        `Página ${pageNumber} de ${pageCount}`,
        pageWidth - 14,
        pageHeight - 7,
        {
          align: "right",
        }
      );
    }

    doc.save(
      `${safeBusinessName}_Reporte_Cuentas_por_Cobrar_${currentDate}.pdf`
    );
  }

  /*
   * ==========================================
   * EXPORTAR COMPRAS A EXCEL
   * ==========================================
   */

  function exportPurchases() {
    const workbook = XLSX.utils.book_new();

    const completedPurchases =
      purchases.filter(
        (purchase) =>
          purchase.status === "COMPLETED"
      );

    const totalPurchased =
      completedPurchases.reduce(
        (accumulator, purchase) =>
          accumulator + purchase.total,
        0
      );

    const totalUnits =
      completedPurchases.reduce(
        (purchaseAccumulator, purchase) =>
          purchaseAccumulator +
          purchase.items.reduce(
            (itemAccumulator, item) =>
              itemAccumulator +
              item.quantity,
            0
          ),
        0
      );

    const summaryData = [
      {
        Indicador: "Empresa",
        Valor: businessName,
      },
      {
        Indicador: "Fecha de generación",
        Valor: new Date().toLocaleString("es-GT"),
      },
      {
        Indicador: "Moneda",
        Valor: currency,
      },
      {
        Indicador: "Compras registradas",
        Valor: purchases.length,
      },
      {
        Indicador: "Compras completadas",
        Valor: completedPurchases.length,
      },
      {
        Indicador: "Unidades compradas",
        Valor: totalUnits,
      },
      {
        Indicador: "Total comprado",
        Valor: totalPurchased,
      },
    ];

    addWorksheet(
      workbook,
      summaryData,
      "Resumen",
      [30, 32]
    );

    const purchasesData =
      purchases.map((purchase) => {
        const totalQuantity =
          purchase.items.reduce(
            (accumulator, item) =>
              accumulator +
              item.quantity,
            0
          );

        return {
          "Número de compra":
            purchase.purchaseNumber,
          Fecha: formatDate(
            purchase.purchaseDate
          ),
          Proveedor:
            purchase.supplier,
          Estado:
            formatPurchaseStatus(
              purchase.status
            ),
          "Líneas de producto":
            purchase.items.length,
          "Unidades compradas":
            totalQuantity,
          Total:
            purchase.total,
          Notas:
            purchase.notes || "",
        };
      });

    addWorksheet(
      workbook,
      purchasesData,
      "Compras",
      [
        20,
        23,
        32,
        18,
        20,
        20,
        18,
        40,
      ]
    );

    const purchasesDetailData =
      purchases.flatMap(
        (purchase) =>
          purchase.items.map(
            (item) => ({
              "Número de compra":
                purchase.purchaseNumber,
              Fecha:
                formatDate(
                  purchase.purchaseDate
                ),
              Proveedor:
                purchase.supplier,
              Estado:
                formatPurchaseStatus(
                  purchase.status
                ),
              Código:
                item.productCode,
              Producto:
                item.productName,
              Cantidad:
                item.quantity,
              "Costo unitario":
                item.unitCost,
              Subtotal:
                item.subtotal,
            })
          )
      );

    addWorksheet(
      workbook,
      purchasesDetailData,
      "Detalle compras",
      [
        20,
        23,
        30,
        17,
        16,
        34,
        12,
        18,
        18,
      ]
    );

    XLSX.writeFile(
      workbook,
      `${safeBusinessName}_Compras_${currentDate}.xlsx`
    );
  }

  /*
   * ==========================================
   * EXPORTAR COMPRAS A PDF
   * ==========================================
   */

  function exportPurchasesPdf() {
    if (purchases.length === 0) {
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const completedPurchases =
      purchases.filter(
        (purchase) =>
          purchase.status === "COMPLETED"
      );

    const totalPurchased =
      completedPurchases.reduce(
        (accumulator, purchase) =>
          accumulator + purchase.total,
        0
      );

    const totalUnits =
      completedPurchases.reduce(
        (purchaseAccumulator, purchase) =>
          purchaseAccumulator +
          purchase.items.reduce(
            (itemAccumulator, item) =>
              itemAccumulator +
              item.quantity,
            0
          ),
        0
      );

    doc.setFillColor(15, 23, 42);

    doc.rect(
      0,
      0,
      pageWidth,
      38,
      "F"
    );

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(18);

    doc.text(
      businessName,
      14,
      15
    );

    doc.setFontSize(13);

    doc.text(
      "Reporte de compras",
      14,
      24
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      203,
      213,
      225
    );

    doc.text(
      `Generado: ${new Date().toLocaleString("es-GT")}`,
      14,
      31
    );

    doc.text(
      `Moneda: ${currency}`,
      pageWidth - 14,
      31,
      {
        align: "right",
      }
    );

    doc.setTextColor(
      15,
      23,
      42
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(12);

    doc.text(
      "Resumen",
      14,
      49
    );

    const summaryY = 55;

    const cardWidth =
      (pageWidth - 28 - 9) / 4;

    const cardHeight = 22;

    const summaryCards = [
      {
        label: "Compras registradas",
        value:
          purchases.length.toLocaleString(
            "es-GT"
          ),
      },

      {
        label: "Compras completadas",
        value:
          completedPurchases.length.toLocaleString(
            "es-GT"
          ),
      },

      {
        label: "Unidades compradas",
        value:
          totalUnits.toLocaleString(
            "es-GT"
          ),
      },

      {
        label: "Total comprado",
        value: formatCurrency(
          totalPurchased,
          currency
        ),
      },
    ];

    summaryCards.forEach(
      (card, index) => {
        const x =
          14 +
          index *
            (cardWidth + 3);

        doc.setFillColor(
          248,
          250,
          252
        );

        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.roundedRect(
          x,
          summaryY,
          cardWidth,
          cardHeight,
          2,
          2,
          "FD"
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          card.label,
          x + 4,
          summaryY + 7
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(12);

        doc.setTextColor(
          15,
          23,
          42
        );

        doc.text(
          card.value,
          x + 4,
          summaryY + 16
        );
      }
    );

    const purchasesTableBody =
      purchases.map(
        (purchase) => {
          const units =
            purchase.items.reduce(
              (
                accumulator,
                item
              ) =>
                accumulator +
                item.quantity,
              0
            );

          return [
            purchase.purchaseNumber,
            formatDate(
              purchase.purchaseDate
            ),
            purchase.supplier,
            formatPurchaseStatus(
              purchase.status
            ),
            String(
              purchase.items.length
            ),
            String(units),
            formatCurrency(
              purchase.total,
              currency
            ),
          ];
        }
      );

    autoTable(doc, {
      startY: 84,

      head: [
        [
          "Compra",
          "Fecha",
          "Proveedor",
          "Estado",
          "Productos",
          "Unidades",
          "Total",
        ],
      ],

      body:
        purchasesTableBody,

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3,
        textColor: [
          30,
          41,
          59,
        ],
        lineColor: [
          226,
          232,
          240,
        ],
        lineWidth: 0.2,
        valign: "middle",
      },

      headStyles: {
        fillColor: [
          15,
          23,
          42,
        ],
        textColor: [
          255,
          255,
          255,
        ],
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: [
          248,
          250,
          252,
        ],
      },

      columnStyles: {
        0: {
          cellWidth: 31,
        },

        1: {
          cellWidth: 40,
        },

        2: {
          cellWidth: 61,
        },

        3: {
          cellWidth: 28,
          halign: "center",
        },

        4: {
          cellWidth: 25,
          halign: "center",
        },

        5: {
          cellWidth: 25,
          halign: "center",
        },

        6: {
          cellWidth: 38,
          halign: "right",
        },
      },

      margin: {
        left: 14,
        right: 14,
        bottom: 18,
      },

      didDrawPage: () => {
        doc.setDrawColor(
          226,
          232,
          240
        );

        doc.line(
          14,
          pageHeight - 13,
          pageWidth - 14,
          pageHeight - 13
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8);

        doc.setTextColor(
          100,
          116,
          139
        );

        doc.text(
          `${businessName} - ControlStock Pro`,
          14,
          pageHeight - 7
        );
      },
    });

    const pageCount =
      doc.getNumberOfPages();

    for (
      let pageNumber = 1;
      pageNumber <= pageCount;
      pageNumber++
    ) {
      doc.setPage(
        pageNumber
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(8);

      doc.setTextColor(
        100,
        116,
        139
      );

      doc.text(
        `Página ${pageNumber} de ${pageCount}`,
        pageWidth - 14,
        pageHeight - 7,
        {
          align: "right",
        }
      );
    }

    doc.save(
      `${safeBusinessName}_Reporte_Compras_${currentDate}.pdf`
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet
            size={22}
            className="text-green-700"
          />

          <h2 className="text-xl font-bold text-slate-900">
            Exportar reportes
          </h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Descarga la información del negocio en Excel y PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* INVENTARIO EXCEL */}
        <button
          type="button"
          onClick={exportInventory}
          className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Boxes size={23} />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Inventario Excel
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Stock y valorización.
              </p>
            </div>
          </div>

          <Download
            size={20}
            className="shrink-0 text-slate-400 transition group-hover:text-green-700"
          />
        </button>

        {/* INVENTARIO PDF */}
        <button
          type="button"
          onClick={
            exportInventoryPdf
          }
          disabled={
            products.length === 0
          }
          className={`group flex items-center justify-between rounded-2xl border p-5 text-left shadow-sm transition ${
            products.length === 0
              ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                products.length === 0
                  ? "bg-slate-200 text-slate-500"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <FileText
                size={23}
              />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Inventario PDF
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {products.length === 0
                  ? "Sin productos para exportar."
                  : "Reporte profesional del inventario."}
              </p>
            </div>
          </div>

          <Download
            size={20}
            className={`shrink-0 transition ${
              products.length === 0
                ? "text-slate-300"
                : "text-slate-400 group-hover:text-red-700"
            }`}
          />
        </button>

        {/* VENTAS EXCEL */}
        <button
          type="button"
          onClick={exportSales}
          className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <Wallet size={23} />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Ventas Excel
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Ventas y productos.
              </p>
            </div>
          </div>

          <Download
            size={20}
            className="shrink-0 text-slate-400 transition group-hover:text-green-700"
          />
        </button>

        {/* VENTAS PDF */}
        <button
          type="button"
          onClick={exportSalesPdf}
          disabled={
            sales.length === 0
          }
          className={`group flex items-center justify-between rounded-2xl border p-5 text-left shadow-sm transition ${
            sales.length === 0
              ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                sales.length === 0
                  ? "bg-slate-200 text-slate-500"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <FileText
                size={23}
              />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Ventas PDF
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {sales.length === 0
                  ? "Sin ventas para exportar."
                  : "Reporte profesional de ventas."}
              </p>
            </div>
          </div>

          <Download
            size={20}
            className={`shrink-0 transition ${
              sales.length === 0
                ? "text-slate-300"
                : "text-slate-400 group-hover:text-red-700"
            }`}
          />
        </button>

        {/* COMPRAS EXCEL */}
        <button
          type="button"
          onClick={
            exportPurchases
          }
          className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ShoppingCart
                size={23}
              />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Compras Excel
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Compras y proveedores.
              </p>
            </div>
          </div>

          <Download
            size={20}
            className="shrink-0 text-slate-400 transition group-hover:text-blue-700"
          />
        </button>

        {/* COMPRAS PDF */}
        <button
          type="button"
          onClick={
            exportPurchasesPdf
          }
          disabled={
            purchases.length === 0
          }
          className={`group flex items-center justify-between rounded-2xl border p-5 text-left shadow-sm transition ${
            purchases.length === 0
              ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                purchases.length === 0
                  ? "bg-slate-200 text-slate-500"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <FileText
                size={23}
              />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Compras PDF
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {purchases.length === 0
                  ? "Sin compras para exportar."
                  : "Reporte profesional de compras."}
              </p>
            </div>
          </div>

          <Download
            size={20}
            className={`shrink-0 transition ${
              purchases.length === 0
                ? "text-slate-300"
                : "text-slate-400 group-hover:text-red-700"
            }`}
          />
        </button>

        {/* CUENTAS POR COBRAR EXCEL */}
        <button
          type="button"
          onClick={exportReceivables}
          disabled={receivables.length === 0}
          className={`group flex items-center justify-between rounded-2xl border p-5 text-left shadow-sm transition ${
            receivables.length === 0
              ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                receivables.length === 0
                  ? "bg-slate-200 text-slate-500"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <Wallet size={23} />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Cuentas por cobrar Excel
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cartera, abonos y saldos pendientes.
              </p>
            </div>
          </div>

          <Download
            size={20}
            className={`shrink-0 transition ${
              receivables.length === 0
                ? "text-slate-300"
                : "text-slate-400 group-hover:text-emerald-700"
            }`}
          />
        </button>

        {/* CUENTAS POR COBRAR PDF */}
        <button
          type="button"
          onClick={exportReceivablesPdf}
          disabled={receivables.length === 0}
          className={`group flex items-center justify-between rounded-2xl border p-5 text-left shadow-sm transition ${
            receivables.length === 0
              ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
              : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                receivables.length === 0
                  ? "bg-slate-200 text-slate-500"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <FileText size={23} />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Cuentas por cobrar PDF
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Reporte profesional de la cartera.
              </p>
            </div>
          </div>

          <Download
            size={20}
            className={`shrink-0 transition ${
              receivables.length === 0
                ? "text-slate-300"
                : "text-slate-400 group-hover:text-red-700"
            }`}
          />
        </button>
      </div>
    </section>
  );
}