'use client';
import React from 'react';
import { GraduationCap, ShieldCheck, Database, Award } from 'lucide-react';

export default function AboutSection() {
  return (
    <section
      id="about"
      className="bg-muted/30 border-border/60 relative scroll-mt-24 border-t py-14 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Section Header */}
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-700 dark:text-emerald-300">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Academic Capstone Project</span>
            </div>
            <h2 className="text-foreground text-2xl font-black tracking-tight sm:text-3xl">
              About GalloTrack
            </h2>
            {/* TODO: Add full CICI acronym expansion once confirmed */}
            <p className="text-muted-foreground mx-auto max-w-2xl text-sm leading-relaxed font-medium sm:text-base">
              GalloTrack was conceived and developed as an{' '}
              <strong className="text-foreground">ISUFST CICI Capstone Project</strong> at Iloilo
              State University of Fisheries Science and Technology.
            </p>
          </div>

          {/* Narrative & Focus Cards */}
          <div className="border-border/80 bg-card space-y-6 rounded-2xl border p-6 shadow-sm sm:p-8">
            <div className="text-muted-foreground space-y-3 text-sm leading-relaxed font-medium">
              <p>
                Gamefowl breeding often relies on handwritten notebooks or memory, leading to lost
                parentage records, uncertain bloodline percentages, and fragmented fight logs.
              </p>
              <p>
                GalloTrack addresses these challenges with organized, digital pedigree records. By
                following structured naming standards (numeric Sire IDs, letter Dam IDs, and birth
                codes like 1A1), breeders keep consistent lineage records alongside match logs.
              </p>
            </div>

            {/* Core Tenets Grid */}
            <div className="border-border/60 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-foreground text-xs font-extrabold">Lineage Consistency</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                    Structured parentage mapping and offspring birth codes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-foreground text-xs font-extrabold">Farm Privacy</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                    Isolated records per farm account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-foreground text-xs font-extrabold">Match Analytics</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                    Match records, outcome tracking, and condition logs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
