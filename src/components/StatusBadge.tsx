import {
  CircleCheck,
  CircleAlert,
  CircleX,
  Clock,
} from "lucide-react";


type StatusBadgeProps = {
  status: string;
};


export default function StatusBadge({
  status,
}: StatusBadgeProps) {

  const normalizedStatus =
    status.toUpperCase();


  const styles: Record<
    string,
    {
      label: string;
      className: string;
      icon: React.ElementType;
    }
  > = {

    PAID: {
      label: "Pagada",
      className:
        "bg-green-100 text-green-700",
      icon: CircleCheck,
    },

    PAGADA: {
      label: "Pagada",
      className:
        "bg-green-100 text-green-700",
      icon: CircleCheck,
    },


    PARTIAL: {
      label: "Pago parcial",
      className:
        "bg-amber-100 text-amber-700",
      icon: Clock,
    },

    PARCIAL: {
      label: "Pago parcial",
      className:
        "bg-amber-100 text-amber-700",
      icon: Clock,
    },


    PENDING: {
      label: "Pendiente",
      className:
        "bg-red-100 text-red-700",
      icon: CircleAlert,
    },

    PENDIENTE: {
      label: "Pendiente",
      className:
        "bg-red-100 text-red-700",
      icon: CircleAlert,
    },


    OVERDUE: {
      label: "Vencida",
      className:
        "bg-red-200 text-red-800",
      icon: CircleX,
    },

    VENCIDA: {
      label: "Vencida",
      className:
        "bg-red-200 text-red-800",
      icon: CircleX,
    },

  };


  const current =
    styles[normalizedStatus] || {
      label: status,
      className:
        "bg-slate-100 text-slate-700",
      icon: Clock,
    };


  const Icon = current.icon;


  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${current.className}`}
    >
      <Icon size={13} />

      {current.label}

    </span>
  );
}