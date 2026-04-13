export const HERO_BACKGROUND_IMAGE = "/images/hero/apex-ride-hero.jpg";
// Coloca la imagen hero local en: apps/web/public/images/hero/apex-ride-hero.jpg

export const NAV_LINKS = [
  { label: "Beneficios", href: "#beneficios" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Features", href: "#features" },
  { label: "Comunidad", href: "#comunidad" }
] as const;

export const BENEFITS = [
  {
    title: "Mejora tu rendimiento",
    description: "Entrena con metricas por salida, elevacion y ritmo para progresar semana a semana."
  },
  {
    title: "Registra cada ride",
    description: "Tracking GPS estable para capturar cada tramo con precision y sin friccion."
  },
  {
    title: "Sigue tu progreso",
    description: "Visualiza avances personales con objetivos claros en distancia, constancia y tiempo."
  }
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Activa el registro",
    description: "Inicia el tracking en segundos y deja que Apex Ride capture ruta, ritmo y desnivel."
  },
  {
    step: "02",
    title: "Analiza el detalle",
    description: "Revisa segmentos, mapas y puntos clave para entender donde ganas o pierdes tiempo."
  },
  {
    step: "03",
    title: "Compite mejor",
    description: "Comparate con tu comunidad, sube en leaderboards y repite con estrategia."
  }
] as const;

export const FEATURES = [
  {
    title: "Domina tus segmentos",
    description: "Intentos validados con rankings claros para competir con datos confiables."
  },
  {
    title: "Explora mapas",
    description: "Visualiza recorridos sobre mapa interactivo para descubrir nuevas rutas y retos."
  },
  {
    title: "Planes de entrenamiento",
    description: "Define objetivos semanales y organiza tus salidas para construir consistencia real."
  },
  {
    title: "Insight de rendimiento",
    description: "Velocidad, distancia, elevacion y comparativas historicas en una vista accionable."
  }
] as const;

export const COMMUNITY_METRICS = [
  { value: "120K+", label: "rides registrados" },
  { value: "4.8", label: "rating de experiencia" },
  { value: "2.3K", label: "segmentos activos" }
] as const;
