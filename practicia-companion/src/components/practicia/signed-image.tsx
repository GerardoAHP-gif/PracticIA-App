import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { urlFirmada } from "@/lib/actions";

const ES_IMAGEN = /\.(jpe?g|png|webp|gif|heic)$/i;

/** Miniatura de un archivo privado de Storage (usa una URL firmada temporal). */
export function SignedImage({ path, className }: { path?: string | undefined; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (path && ES_IMAGEN.test(path)) {
      urlFirmada(path).then((u) => {
        if (!cancelled) setUrl(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}>
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }
  return <img src={url} alt="" loading="lazy" className={`object-cover ${className ?? ""}`} />;
}
