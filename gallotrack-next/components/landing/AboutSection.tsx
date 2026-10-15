'use client';
import React from 'react';
import { GraduationCap, ShieldCheck, Database, Award } from 'lucide-react';

export default function AboutSection() {
  return (
    <section id="about" className="py-14 sm:py-20 bg-muted/30 border-t border-border/60 relative scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Academic Capstone Project</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              About GalloTrack
            </h2>
            {/* TODO: Add full CICI acronym expansion once confirmed */}
            <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto">
              GalloTrack was conceived and developed as an <strong className="text-foreground">ISUFST CICI Capstone Project</strong> at Iloilo State University of Fisheries Science and Technology.
            </p>
          </div>

          {/* Narrative & Focus Cards */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-3 text-sm text-muted-foreground font-medium leading-relaxed">
              <p>
                Gamefowl breeding often relies on handwritten notebooks or memory, leading to lost parentage records, uncertain bloodline percentages, and fragmented fight logs.
              </p>
              <p>
                GalloTrack addresses these challenges with organized, digital pedigree records. By following structured naming standards (numeric Sire IDs, letter Dam IDs, and birth codes like 1A1), breeders keep consistent lineage records alongside match logs.
              </p>
            </div>

            {/* Core Tenets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-foreground">Lineage Consistency</h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Structured parentage mapping and offspring birth codes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-foreground">Farm Privacy</h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Isolated records per farm account.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-foreground">Match Analytics</h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Match records, outcome tracking, and condition logs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
