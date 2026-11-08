import { SiteLink as Link } from "@/components/SiteLink";

export function HowItWorksContent() {
  return (
    <article className="flex flex-col gap-6 pt-4 sm:pt-10">
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        How it works <span aria-hidden>🔧</span>
      </h1>
      <div className="card prose-casual p-5 sm:p-8">
        <p className="text-lg">
          Short version: pick a vote (any general election from 2005 to 2024, the 2016 Brexit referendum or the 2014 Scottish independence referendum), we take the real result in every seat or counting area, make an educated guess about{" "}
          <i>who</i> cast those votes, then quietly remove some people and recount. No polling
          station staff were harmed.
        </p>

        <h2>1. Start with the real result</h2>
        <p>
          For each of the 650 constituencies we know how many votes every party actually got, from
          the House of Commons Library&apos;s results database. That&apos;s our anchor: whatever we do, if everybody votes, we get the real
          result back.
        </p>

        <h2>2. Guess who voted for whom</h2>
        <p>
          Nobody publishes &ldquo;how 18–24s voted in Clacton&rdquo;. What we do have is
          YouGov&apos;s huge post-election survey (42,000 people) saying how each age group, sex,
          social grade, education level, housing situation and work status voted nationally (plus
          Ipsos for ethnicity), and how big a slice of all voters each
          group was.
        </p>
        <p>
          So for every seat we make a first guess: <i>the group&apos;s slice of voters × its national
          vote share for each party</i>. Then we nudge that guess up and down, round and round
          (it&apos;s called <b>raking</b>, or iterative proportional fitting, if you want to sound
          clever at a party) until two things are true:
        </p>
        <p>
          The &ldquo;slice of voters&rdquo; is local. We take each seat&apos;s Census figures (2021
          on the 2024 boundaries, 2011 on the old ones) and compare them with Great Britain as a
          whole. If a seat has three times the national share of 18–24s, it gets three times the
          national share of 18–24 voters. So Sheffield Central&apos;s voters come out at about 37%
          18–24s, against about 10% nationally, while a retirement hotspot on the coast is stacked with
          over-70s. This covers age, sex, social grade, education, housing, work and ethnicity.
        </p>
        <ul>
          <li>each party&apos;s votes add up to exactly what it really got in that seat, and</li>
          <li>each group still makes up the same slice of that seat&apos;s voters.</li>
        </ul>
        <p>
          That&apos;s why, in a seat where Reform did brilliantly, more of those Reform votes get
          pinned on the groups that like Reform (older, non-graduate, C2DE voters), and the SNP only
          gets votes in Scotland, even though the national polling numbers are the same everywhere.
        </p>

        <h2>3. Remove some people, recount</h2>
        <p>
          Pick a scenario and we either delete the chosen groups&apos; estimated votes (&ldquo;nobody
          in these groups voted&rdquo;) or keep <i>only</i> theirs. Whoever has the most votes left
          in each seat wins it, first-past-the-post style. Add up the seats, check whether anyone has
          326 or more, and write a cheeky headline.
        </p>

        <h2>4. Referendums work the same way</h2>
        <p>
          For the 2016 EU referendum we use the Electoral Commission&apos;s Remain and Leave counts in
          all 382 counting areas, and for the 2014 Scottish referendum the Yes and No counts in all 32
          councils. Instead of parties there are two answers, and instead of seats we just add up the
          votes, because a referendum is won on the national count. We still show which areas would
          change sides, for fun. The group splits come from YouGov and Lord Ashcroft&apos;s polls on
          the day, so the same caveats apply (the Scottish poll only had 14 16–17-year-olds in it).
        </p>

        <h2>5. Change the rules</h2>
        <p>
          First past the post hands out seats very unevenly: in 2024 Labour won 63% of the seats on 34% of
          the vote. So you can re-count the same votes under three other systems:
        </p>
        <ul>
          <li>
            <b>Pure proportional:</b> all 650 seats shared out by national vote share, using the
            Sainte-Laguë method (the fairest of the usual formulas).
          </li>
          <li>
            <b>PR with a 5% hurdle:</b> like Germany. Parties under 5% of the national vote get nothing, so
            the SNP, Plaid and all the Northern Irish parties drop out. Seats are shared with the D&apos;Hondt
            method, which leans slightly towards big parties.
          </li>
          <li>
            <b>Regional lists:</b> how Britain elected MEPs until 2019. Each of the 12 regions keeps its
            number of seats and shares them out by its own vote, using D&apos;Hondt.
          </li>
        </ul>
        <p>
          Votes for independents and &ldquo;other&rdquo; candidates don&apos;t count under PR, because there&apos;s
          no party list for them. We also assume everyone votes the same way under every system, which
          they wouldn&apos;t: under PR, lots of tactical voters would switch to their real first choice.
          The &ldquo;wonkiness score&rdquo; is the Gallagher index, the standard measure of how far seats
          are from votes (0 is perfect; UK general elections usually land between 15 and 25).
        </p>

        <h2>6. Who gets the keys to No 10?</h2>
        <p>
          If one party has a majority, they govern. If not, we list every combination of up to four
          parties that adds up to a majority, where nobody is a passenger (drop any member and it falls
          short). Sinn Féin don&apos;t take their seats and the Speaker doesn&apos;t vote, so the line
          moves down a bit. Each deal gets a score from two things:
        </p>
        <ul>
          <li>
            <b>How willing the parties are to work together</b>, on a 0 to 1 scale. This is our own
            judgement, not a poll. For example, Conservatives and DUP score 0.8 (0.9 in 2017, when they
            did a deal), Labour and the Greens 0.6, Labour and the SNP 0.3, and Labour and the
            Conservatives almost zero.
          </li>
          <li>
            <b>How many parties are in it</b>, since every extra partner makes a deal harder.
          </li>
        </ul>
        <p>
          Parties close to the line also get a shot at running a minority government. The scores are then
          turned into percentages. The willingness numbers shift with each election to match what was
          going on at the time:
        </p>
        <ul>
          <li><b>2010:</b> the Conservatives and Lib Dems actually did a coalition.</li>
          <li><b>2015:</b> Ed Miliband ruled out any deal with the SNP.</li>
          <li><b>2017:</b> Theresa May did a confidence-and-supply deal with the DUP, and the Lib Dems ruled out coalitions.</li>
          <li><b>2019:</b> Jo Swinson ruled out putting either Johnson or Corbyn in No 10, and the Brexit Party stood down in Tory-held seats.</li>
          <li><b>2024:</b> Labour ruled out deals with the SNP.</li>
        </ul>

        <h2>The big fat caveats 🧂</h2>
        <ul>
          <li>
            <b>It&apos;s a toy.</b> It&apos;s for curiosity and pub arguments, not predictions.
          </li>
          <li>
            <b>Ecological assumptions.</b> We assume, say, young people in Truro vote like young
            people nationally, adjusted to fit Truro&apos;s result. Reality is lumpier.
          </li>
          <li>
            <b>The local mix is an estimate.</b> The Census tells us who lives in each seat, not who
            voted there. We assume each group&apos;s national turnout gap holds everywhere (if young
            people vote less nationally, they vote less in Sheffield too). Census bands don&apos;t
            always line up with the polls&apos; bands, so some are split evenly by year of age, and
            social grade is approximated from the Census&apos;s occupation classes (NS-SeC). Northern
            Ireland has no Census figures here, and Scotland&apos;s 2021 figures only cover age, sex and
            ethnicity, so those seats use the national mix for the rest. Income, Brexit vote and
            newspaper readership aren&apos;t in the Census, so they always use the national mix.
          </li>
          <li>
            <b>Older elections have thinner polling.</b> For 2005, 2010 and 2015 the only big post-election
            breakdowns we could get are Ipsos&apos;s, which split out Con, Lab, Lib Dem (and UKIP and
            Green in 2015) and lump everyone else together. The SNP, Plaid and friends are worked
            out from where they actually won votes. Group sizes for 2015–2019 Ipsos slices are
            estimated from Ipsos&apos;s 2010 survey profile.
          </li>
          <li>
            <b>2005 has no local mix and no map.</b> The 2005 seats were drawn on older boundaries
            (except in Scotland), and we don&apos;t have Census figures or a hex map for them. So every
            2005 seat uses the national voter mix from Ipsos, and the results show the Commons
            chart instead of a map.
          </li>
          <li>
            <b>Ethnicity is the roughest slice.</b> Ipsos is the only post-election poll we could
            get with a White / Asian / Black / Mixed split, and it warns the minority samples are
            small. It doesn&apos;t report &ldquo;other&rdquo; ethnic groups separately, so we lump
            them in with Mixed. Take these ones with a big pinch of salt.
          </li>
          <li>
            <b>One slice at a time.</b> Age, sex, class and education are modelled separately, so
            you can&apos;t (yet) do &ldquo;only female graduates under 35&rdquo;.
          </li>
          <li>
            <b>Nobody changes their mind.</b> If half the country stayed home, the other half might
            vote differently: no tactical voting shifts, no different campaigns, no different
            candidates. Everyone left votes exactly as before.
          </li>
          <li>
            <b>Polls are polls.</b> Group-level vote shares come from post-election surveys, which
            have margins of error and their own definitions (social grade especially).
          </li>
          <li>
            <b>Small parties get fuzzy.</b> &ldquo;Other&rdquo; and independents lump together lots
            of very different candidates. The polls are Great Britain only, so in Northern Ireland we
            assume every group voted the same way, which means NI seats basically never change.
          </li>
          <li>
            <b>Rounding.</b> Raking runs a fixed number of rounds, so tiny numbers can wobble by a
            vote or two. In a really tight seat that could matter, which is half the fun.
          </li>
        </ul>
        <p>
          Every number we use is listed on the <Link href="/sources/">sources page</Link>.
        </p>
      </div>
    </article>
  );
}
