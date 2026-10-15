import { Container } from "./Container";
import { Kicker } from "./Kicker";
import { MetaLabel } from "./MetaLabel";
import { Reveal } from "./Reveal";

/** Shared header for inner pages: meta label, H2-scale title, one paragraph. */
export function PageIntro({
  label,
  title,
  badge = "Coming soon",
  children,
}: {
  label: string;
  title: string;
  /** Small boxed status next to the label; null hides it. */
  badge?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-20 pb-16 md:pt-28 lg:pt-32 lg:pb-24">
      <Container>
        <Reveal>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Kicker>{label}</Kicker>
            {badge ? <MetaLabel className="border border-rule px-2 py-1">{badge}</MetaLabel> : null}
          </div>
          <h1 className="mt-8 max-w-[18ch] text-h2 font-medium text-balance">{title}</h1>
          <p className="mt-8 max-w-measure md:text-xl md:leading-[1.5]">{children}</p>
        </Reveal>
      </Container>
    </section>
  );
}
