'use client';
import React from 'react';
import { GraduationCap, ShieldCheck, Database, Award } from 'lucide-react';

export default function AboutSection() {
  return (
    <section id="about" className="py-20 sm:py-28 bg-muted/30 border-t border-border/60 relative scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Section Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide">
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Academic Capstone Initiative</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              About GalloTrack
            </h2>
            <p className="text-base text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto">
              GalloTrack was conceived and developed as an <strong className="text-foreground">ISUFST CICT Capstone Project</strong> (College of Information and Communications Technology, Iloilo State University of Fisheries Science and Technology).
            </p>
          </div>

          {/* Narrative & Focus Cards */}
          <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-10 shadow-sm space-y-8">
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">
              <p>
                Gamefowl breeding in the Philippines has traditionally depended on handwritten pedigree notebooks, memory, and fragmented records. This introduces risks of parentage loss, inaccurate cross-breeding percentages, and unverified fight histories across generations.
              </p>
              <p>
                GalloTrack addresses these challenges by transforming raw breeding data into actionable agricultural intelligence. By implementing rigorous generational naming standards (Sire numbers, Dam letters, and structured Offspring codes like 1A1), breeders maintain an indisputable, digitized pedigree database with detailed fight performance metrics.
              </p>
            </div>

            {/* Core Tenets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">Data Integrity</h4>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Strict lineage hierarchy and unalterable generational records.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">Breeder Privacy</h4>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Farm-isolated security protocols and role-based permissions.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">Actionable Analytics</h4>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Real fight outcome tracking and post-encounter recovery monitoring.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
