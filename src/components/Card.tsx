import React from "react";
import { cn } from "@/lib/utils";
import { CardProps } from "@/types";

const Card: React.FC<CardProps & { onClick?: () => void }> = ({
  children,
  title,
  subtitle,
  className,
  padding = "md",
  shadow = "md",
  onClick,
  ...props
}) => {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const shadowClasses = {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    none: "shadow-none",
  };

  const classes = cn(
    "bg-white rounded-lg border border-gray-200",
    paddingClasses[padding],
    shadowClasses[shadow],
    className
  );

  return (
    <div className={classes} onClick={onClick} {...props}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
