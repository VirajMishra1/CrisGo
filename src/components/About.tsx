"use client";

import { Code, Palette, Rocket } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="py-24 px-6 bg-muted/20">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">About Me</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Passionate about creating elegant solutions to complex problems
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Code className="text-primary" size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Clean Code</h3>
            <p className="text-muted-foreground">
              Writing maintainable, scalable code with best practices and modern technologies
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Palette className="text-primary" size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Design First</h3>
            <p className="text-muted-foreground">
              Crafting beautiful user interfaces that are both functional and delightful
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl border border-border hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Rocket className="text-primary" size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-3">Fast Performance</h3>
            <p className="text-muted-foreground">
              Optimizing every aspect for speed and efficiency to deliver the best experience
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-card p-8 rounded-xl border border-border">
          <p className="text-lg leading-relaxed mb-4">
            I'm a full-stack developer with a passion for building modern web applications. With expertise in
            React, Next.js, TypeScript, and Node.js, I create seamless digital experiences that users love.
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground">
            When I'm not coding, you'll find me exploring new technologies, contributing to open-source projects,
            or sharing knowledge with the developer community.
          </p>
        </div>
      </div>
    </section>
  );
}