export interface CinematicSection {
  id: string;
  index: number;
  title: string;
  description: string;
  video?: string;
  poster?: string;
}

// Pexels CDN MP4 placeholders (royalty-free)
export const SECTIONS: CinematicSection[] = [
  {
    id: "genesis",
    index: 1,
    title: "Genesis",
    description: "Začiatok je jediná veta. Zvyšok je svetlo.",
  },
  {
    id: "neural-weaver",
    index: 2,
    title: "Neural Weaver",
    description: "Spletáme vlákna logiky do autonómnych strojov.",
    video: "https://videos.pexels.com/video-files/3163534/3163534-uhd_2560_1440_30fps.mp4",
  },
  {
    id: "architect-pulse",
    index: 3,
    title: "Architect Pulse",
    description: "Presnosť v každom pixeli vášho workflowu.",
    video: "https://videos.pexels.com/video-files/2519660/2519660-uhd_2560_1440_30fps.mp4",
  },
  {
    id: "liquid-flow",
    index: 4,
    title: "Liquid Flow",
    description: "Plynulosť, ktorá nepozná hranice.",
    video: "https://videos.pexels.com/video-files/4434242/4434242-uhd_2560_1440_24fps.mp4",
  },
  {
    id: "quantum-forge",
    index: 5,
    title: "Quantum Forge",
    description: "Kovanie inteligencie pod tlakom dát.",
    video: "https://videos.pexels.com/video-files/3046796/3046796-uhd_2560_1440_24fps.mp4",
  },
  {
    id: "echo-chamber",
    index: 6,
    title: "Echo Chamber",
    description: "Každý prompt rezonuje vo viacerých vrstvách.",
    video: "https://videos.pexels.com/video-files/3015527/3015527-uhd_2560_1440_24fps.mp4",
  },
  {
    id: "prism-logic",
    index: 7,
    title: "Prism Logic",
    description: "Jeden vstup, spektrum výstupov.",
    video: "https://videos.pexels.com/video-files/2611250/2611250-uhd_2560_1440_30fps.mp4",
  },
  {
    id: "velvet-engine",
    index: 8,
    title: "Velvet Engine",
    description: "Surová sila zabalená do hodvábu.",
    video: "https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_24fps.mp4",
  },
  {
    id: "aurora-sync",
    index: 9,
    title: "Aurora Sync",
    description: "Synchronizácia mysle a stroja.",
    video: "https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_24fps.mp4",
  },
  {
    id: "ascension",
    index: 10,
    title: "Ascension",
    description: "Začnite svoju genézu.",
  },
];
