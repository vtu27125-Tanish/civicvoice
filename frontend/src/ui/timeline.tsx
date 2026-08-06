"use client";
import { useScroll, useTransform, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

const itemVariants = {
  hidden: { opacity: 0, x: -36 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 90, damping: 16, staggerChildren: 0.08 }
  }
};

const childVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 140, damping: 14 } }
};

export function TimelineChild({ children }: { children: React.ReactNode }) {
  return <motion.div variants={childVariants}>{children}</motion.div>;
}

function PulsingDot() {
  return (
    <motion.div
      initial={{ scale: 0.6 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: false, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className="h-9 absolute left-2 w-9 rounded-full bg-white flex items-center justify-center border-2"
      style={{ borderColor: "var(--primary-container)" }}
    >
      <motion.span
        animate={{ scale: [1, 1.9, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full"
        style={{ background: "var(--primary-container)" }}
      />
      <motion.div
        className="h-3 w-3 rounded-full relative z-10"
        style={{ background: "var(--primary-container)" }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 15%", "end 60%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);
  const progressPercent = useTransform(scrollYProgress, (v) => `${Math.round(v * 100)}%`);

  return (
    <div className="w-full font-sans relative" ref={containerRef}>
      <motion.div
        style={{ opacity: opacityTransform }}
        className="sticky top-4 z-50 float-right"
      >
        <div
          className="rounded-full px-3 py-1 text-xs font-bold shadow-md"
          style={{ background: "var(--primary-container)", color: "white" }}
        >
          <motion.span>{progressPercent}</motion.span>
        </div>
      </motion.div>

      <div ref={ref} className="relative max-w-3xl mx-auto pb-10">
        {data.map((item, index) => (
          <motion.div
            key={index}
            className="flex justify-start pt-10 md:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.35 }}
            variants={itemVariants}
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-24 self-start max-w-[140px] md:w-full">
              <PulsingDot />
              <h3 className="hidden md:block text-sm md:pl-14 font-bold text-[var(--on-surface-variant)] uppercase tracking-wide">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-16 pr-2 w-full">
              <h3 className="md:hidden block text-sm mb-2 font-bold text-[var(--primary)] uppercase">
                {item.title}
              </h3>
              {item.content}
            </div>
          </motion.div>
        ))}

        <div
          style={{ height: height + "px" }}
          className="absolute left-6 top-0 overflow-hidden w-[3px] bg-[var(--outline-variant)] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            className="absolute inset-x-0 top-0 w-[3px] rounded-full"
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: "linear-gradient(to bottom, var(--primary-container), var(--secondary-container))",
                boxShadow: "0 0 12px var(--primary-container), 0 0 4px var(--secondary-container)"
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};