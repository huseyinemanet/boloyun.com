"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { IconCircleCheckFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleCheckFillDuo18";
import { IconCircleInfoFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleInfoFillDuo18";
import { IconCircleXmarkFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconCircleXmarkFillDuo18";
import { IconLoaderFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconLoaderFillDuo18";
import { IconTriangleWarningFillDuo18 } from "nucleo-ui-fill-duo-18/components/IconTriangleWarningFillDuo18";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <IconCircleCheckFillDuo18 className="size-5 text-muted-foreground" />,
        error: <IconCircleXmarkFillDuo18 className="size-5 text-muted-foreground" />,
        warning: <IconTriangleWarningFillDuo18 className="size-5 text-muted-foreground" />,
        info: <IconCircleInfoFillDuo18 className="size-5 text-muted-foreground" />,
        loading: <IconLoaderFillDuo18 className="size-5 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:border-border group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
