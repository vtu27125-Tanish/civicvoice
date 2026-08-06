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
    opacity: 1, x: 0,
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
      style={{
        height: 36, width: 36, position: 'absolute', left: 0,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #00E5CC, #4F8EFF)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 16px rgba(0,229,204,0.4)'
      }}
    >
      {/* Sonar pulse ring */}
      <motion.span
        animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(0,229,204,0.6)'
        }}
      />
      <motion.div
        style={{ width: 10, height: 10, borderRadius: '50%', background: '#080C14', position: 'relative', zIndex: 1 }}
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
      setHeight(ref.current.getBoundingClientRect().height);
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
    <div style={{ width: '100%', position: 'relative', fontFamily: "'Inter', sans-serif" }} ref={containerRef}>
      {/* Scroll progress pill */}
      <motion.div
        style={{ opacity: opacityTransform, position: 'sticky', top: 16, zIndex: 50, float: 'right' }}
      >
        <div style={{
          borderRadius: 999, padding: '3px 12px', fontSize: 11, fontWeight: 700,
          background: 'linear-gradient(135deg, #00E5CC, #4F8EFF)',
          color: '#080C14', fontFamily: "'JetBrains Mono', monospace",
          boxShadow: '0 0 12px rgba(0,229,204,0.4)'
        }}>
          <motion.span>{progressPercent}</motion.span>
        </div>
      </motion.div>

      <div ref={ref} style={{ position: 'relative', maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
        {data.map((item, index) => (
          <motion.div
            key={index}
            style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 36, gap: 0 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.35 }}
            variants={itemVariants}
          >
            {/* Left: dot + title */}
            <div style={{
              position: 'sticky', top: 96, alignSelf: 'flex-start',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              width: 140, flexShrink: 0, zIndex: 40
            }}>
              <PulsingDot />
              <div style={{
                marginTop: 48, fontSize: 11, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3
              }}>
                {item.title}
              </div>
            </div>

            {/* Right: content only — no duplicate title */}
            <div style={{ flex: 1, paddingLeft: 16, paddingRight: 8 }}>
              {item.content}
            </div>
          </motion.div>
        ))}

        {/* Scroll progress line */}
        <div style={{
          height: height + "px",
          position: 'absolute', left: 16, top: 0, overflow: 'hidden', width: 3,
          background: 'rgba(255,255,255,0.06)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)'
        }}>
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform, position: 'absolute', inset: 'auto 0 auto 0', top: 0, width: 3, borderRadius: 999 }}
          >
            <div style={{
              width: '100%', height: '100%', borderRadius: 999,
              background: 'linear-gradient(to bottom, #00E5CC, #4F8EFF)',
              boxShadow: '0 0 10px #00E5CC'
            }} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
