"use client";

const skillCategories = [
  {
    title: "Frontend",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "HTML/CSS", "JavaScript"]
  },
  {
    title: "Backend",
    skills: ["Node.js", "Python", "PostgreSQL", "MongoDB", "REST APIs", "GraphQL"]
  },
  {
    title: "Tools & Others",
    skills: ["Git", "Docker", "AWS", "Vercel", "Figma", "VS Code"]
  }
];

export default function Skills() {
  return (
    <section id="skills" className="py-24 px-6 bg-muted/20">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Skills & Technologies</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Technologies I work with to bring ideas to life
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {skillCategories.map((category, index) => (
            <div key={index} className="bg-card p-8 rounded-xl border border-border">
              <h3 className="text-2xl font-semibold mb-6 text-primary">{category.title}</h3>
              <div className="space-y-3">
                {category.skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-lg">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6">
            Always learning and exploring new technologies to stay current in the ever-evolving tech landscape
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["React", "TypeScript", "Next.js", "Node.js", "Python", "PostgreSQL", "AWS", "Docker"].map((tech, i) => (
              <span key={i} className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}