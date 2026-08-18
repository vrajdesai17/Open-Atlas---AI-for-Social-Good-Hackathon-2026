import type { Domain } from "@/lib/domains";

const STANDARD_OF_REVIEW = `STANDARD OF REVIEW — judge like a skeptical USCIS officer, NOT a supportive mentor. The bar is "sustained national or international acclaim" and being among the small percentage at the very top of the field. Default to skepticism: award "met" only when the evidence clearly clears that high bar. When in doubt, use "partial" or "gap". Do not be flattering.`;

export function getCalibration(domain: Domain, visaId: string): string {
  // Special case: NIW
  if (visaId === "niw") {
    let importanceFraming = "";
    switch (domain) {
      case "arts":
        importanceFraming = "The endeavor must show broader national importance beyond the artistic merit of the work itself (e.g., broad cultural, economic, or societal impact).";
        break;
      case "business":
        importanceFraming = "The endeavor must show broader national importance (e.g., significant US job creation, economic growth, or critical technology advancement).";
        break;
      case "athletics":
        importanceFraming = "The endeavor must show broader national importance beyond personal athletic success (e.g., major cultural impact, national prestige, or significant economic benefit).";
        break;
      case "education":
        importanceFraming = "The endeavor must show broader national importance (e.g., systemic impact on US education, curriculum standards, or educational technology).";
        break;
      case "stem":
      default:
        importanceFraming = "The endeavor must show broader national importance (e.g., critical technological advancements, national security, or significant economic impact).";
        break;
    }
    
    return `${STANDARD_OF_REVIEW}

Calibrations (common over-counting to avoid):
- Substantial merit and national importance: ${importanceFraming} A local or regional endeavor, or one only benefiting a single employer or small group of clients, is a gap.
- Well positioned to advance the endeavor: Requires concrete past success, specialized knowledge, or significant progress towards the endeavor. A mere plan or standard professional qualifications without a track record of execution is insufficient.
- On balance, beneficial to waive the job offer: The benefits of the endeavor must outweigh the US interest in protecting domestic workers via the labor certification process. Often relies on urgency, uniqueness of skills, or impossibility of a traditional job offer.`;
  }

  // Special case: O-1B (arts distinction)
  if (visaId === "o1b") {
    return `${STANDARD_OF_REVIEW}

Calibrations (common over-counting to avoid):
- Lead or starring role in productions: Must be a genuine lead role in productions or events with a distinguished reputation. Understudy, ensemble, or background roles do not qualify.
- National or international recognition: Requires critical reviews or press in major publications attesting to recognition. Self-published reviews or student showcases do not count.
- Lead role for distinguished organizations: Must be a leading or critical role for an arts organization or establishment with a distinguished reputation.
- Record of major commercial or critical success: Needs concrete metrics (box office, streaming volume, sales) or standing. Local/indie success without major impact is insufficient.
- Significant recognition from experts: Testimonials must come from recognized experts in the field, detailing specific achievements, not just general praise from former teachers.
- High salary / remuneration: Requires evidence the compensation is high relative to others in the same arts field. Needs comparative data.`;
  }

  // O1A, EB1A, EB1B - OUTSTANDING criteria set
  let baseBlock = "";

  if (domain === "arts") {
    baseBlock = `${STANDARD_OF_REVIEW}

Calibrations (common over-counting to avoid):
- Awards: Must be nationally or internationally recognized awards (e.g., major festival laurels, industry prizes). Student, local, or university awards do not qualify.
- Membership: Associations requiring outstanding achievement, judged by experts. Ordinary professional or student memberships do not qualify.
- Published material about you: Tier-1 critical press or major media coverage about the person. Rejects self-published reviews or student showcases.
- Judging: Concrete evidence of reviewing others' work (e.g., jury member for major festivals or competitions).
- Original contributions of major significance: Major significance in the arts (e.g., gallery/exhibition placement, strong critical reception). A personal project without wider impact is insufficient.
- Scholarly articles: Authorship of critical or scholarly articles in major media or professional journals.
- Critical role for distinguished organizations: A leading role at a genuinely distinguished arts org. Student or ordinary roles do not qualify.
- High salary / remuneration: Requires evidence of high relative arts-field compensation with comparative data.`;
  } else if (domain === "business") {
    baseBlock = `${STANDARD_OF_REVIEW}

Calibrations (common over-counting to avoid):
- Awards: Nationally or internationally recognized business awards. Internal company awards or local startup prizes do not qualify.
- Membership: Exclusive networks or associations requiring outstanding achievement. Paid networking groups or standard professional memberships do not count.
- Published material about you: Major trade press or national media about the founder/business. Press releases or paid articles do not qualify.
- Judging: Pitch competition judging at a high level, or reviewing for major industry awards.
- Original contributions of major significance: Substantial venture funding amounts/stage, revenue/ARR growth with real numbers, user/customer adoption, patents, or regional economic impact.
- Scholarly articles: Publications in major industry or professional journals. Blog posts or standard thought leadership do not clear the bar.
- Critical role for distinguished organizations: Founder, C-level, or critical role at an org with a distinguished reputation.
- High salary / remuneration: Top tier compensation for the role and region, requiring comparative data.`;
  } else if (domain === "athletics") {
    baseBlock = `${STANDARD_OF_REVIEW}

Calibrations (common over-counting to avoid):
- Awards: Nationally or internationally recognized prizes for excellence. Rejects local/regional/amateur-league achievement alone.
- Membership: National team selection or highly exclusive athletic associations. Standard club or league memberships do not qualify.
- Published material about you: Coverage in major sports media or national press. Local newspaper sports sections are weak evidence.
- Judging: Refereeing or judging at national or international level competitions.
- Original contributions of major significance: Defining new techniques widely adopted, major tournament placement tier, top ranking systems.
- Scholarly articles: Rarely applies in pure athletics unless related to sports science, published in reputable journals.
- Critical role for distinguished organizations: Leading role for a distinguished national team or top-tier professional club.
- High salary / remuneration: Pay in the top tier for the sport, relative to others. Needs comparative data.`;
  } else if (domain === "education") {
    baseBlock = `${STANDARD_OF_REVIEW}

Calibrations (common over-counting to avoid):
- Awards: Nationally or internationally recognized awards for educational excellence. University department awards or standard teaching prizes do not qualify.
- Membership: Associations requiring outstanding educational achievement. Standard teacher unions or general memberships do not count.
- Published material about you: Major media or professional press covering your educational work.
- Judging: Peer review for major educational journals or judging national competitions. Ordinary grading of students does not count.
- Original contributions of major significance: Widespread curriculum adoption evidence, measurable outcomes, peer institutional recognition. Rejects ordinary teaching evaluations.
- Scholarly articles: Authorship in reputable professional education journals.
- Critical role for distinguished organizations: A leading role at an educational institution with a distinguished reputation.
- High salary / remuneration: High compensation relative to other educators in the region/field, requiring comparative data.`;
  } else {
    // Default / STEM
    baseBlock = `${STANDARD_OF_REVIEW}

Calibrations (common over-counting to avoid):
- Awards: must be nationally or internationally recognized awards for excellence in the field, judged by recognized experts. Student competitions, hackathons, university or department awards, scholarships, GPA/dean's-list, and internal company awards do NOT qualify.
- Membership: associations that require outstanding achievement, judged by experts. Ordinary or student memberships do not qualify.
- Published material about you: material ABOUT the person in professional or major trade media — not authored by them, not their own posts or papers.
- Judging: concrete evidence of reviewing or judging others' work in the field (peer review, program committees, competition judging).
- Original contributions of major significance: the contribution must be shown to have MAJOR significance — wide adoption, strong citation impact, or demonstrable influence on the field. A personal project, coursework, or an ordinary repo without evidence of field-wide impact does not clear this bar.
- Scholarly articles: authorship in reputable professional journals or major media. Papers in low-tier, student, or predatory journals, and non-peer-reviewed preprints or workshop notes, are weak evidence at best.
- Critical role for distinguished organizations: requires BOTH a leading or critical (not ordinary) role AND an organization with a genuinely distinguished reputation. Student, intern, or standard-employee roles do not qualify.
- High salary / remuneration: requires evidence the salary is high RELATIVE to others in the same field and region (a top percentile, with comparative data). A raw salary figure with no comparison cannot be "met" — treat it as "partial" at most, and have the examiner note that comparative wage (e.g. BLS) verification is required.`;
  }

  if (visaId === "eb1a") {
    baseBlock += `
- Display of work at artistic exhibitions: Skeptical standard for genuine exhibitions or showcases. Minor or self-organized showcases do not count.
- Commercial success in the performing arts: Requires major commercial success with concrete metrics. Modest or local success is insufficient.`;
  }

  return baseBlock;
}
