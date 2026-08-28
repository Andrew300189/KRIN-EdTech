module.exports=[427699,(e,t,r)=>{t.exports=e.x("events",()=>require("events"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},870722,(e,t,r)=>{t.exports=e.x("tty",()=>require("tty"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},233405,(e,t,r)=>{t.exports=e.x("child_process",()=>require("child_process"))},924868,(e,t,r)=>{t.exports=e.x("fs/promises",()=>require("fs/promises"))},410430,(e,t,r)=>{t.exports=e.x("async_hooks",()=>require("async_hooks"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},921517,(e,t,r)=>{t.exports=e.x("http",()=>require("http"))},524836,(e,t,r)=>{t.exports=e.x("https",()=>require("https"))},500874,(e,t,r)=>{t.exports=e.x("buffer",()=>require("buffer"))},406461,(e,t,r)=>{t.exports=e.x("zlib",()=>require("zlib"))},193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},296638,e=>{"use strict";function t(e){return e?.trim().toLowerCase()??""}e.s(["isPlatformOwner",0,function(e){let r=t(process.env.PLATFORM_OWNER_EMAIL);return!!r&&t(e)===r},"normalizeEmail",0,t])},163460,e=>{"use strict";e.s(["hasAnyRole",0,function(e,t){let r={student:0,teacher:1,content_manager:2,admin:3,super_admin:4};return t.some(t=>r[e]>=r[t])},"parseRole",0,function(e){let t=(e??"").toLowerCase();return"super_admin"===t?"super_admin":"admin"===t?"admin":"content_manager"===t?"content_manager":"teacher"===t||"instructor"===t?"teacher":"student"}])},138033,e=>{"use strict";e.s(["logAuthDiagnostic",0,function(e){}])},475595,e=>{"use strict";let t=new Map;e.s(["consumeRateLimit",0,function(e,r,a){let s=Date.now(),i=t.get(e);return!i||i.resetAt<=s?(t.set(e,{count:1,resetAt:s+a}),{allowed:!0,retryAfterSeconds:0}):i.count>=r?{allowed:!1,retryAfterSeconds:Math.max(1,Math.ceil((i.resetAt-s)/1e3))}:(i.count+=1,{allowed:!0,retryAfterSeconds:0})}])},129117,748813,417726,e=>{"use strict";var t=e.i(254799),r=e.i(904528),a=e.i(160939);function s(e){return e.normalize("NFKC").replace(/\s+/g," ").trim().slice(0,150)}e.s(["DEFAULT_TOTAL_LIMIT",0,20,"MAX_QUERY_LENGTH",0,150,"MIN_QUERY_LENGTH",0,2,"SEARCH_CONTEXTS",0,["PUBLIC","STUDENT","TEACHER","ADMIN"],"SEARCH_RESULT_TYPES",0,["COURSE","CATEGORY","ACADEMY","LESSON","GRAMMAR_TOPIC","VOCABULARY_TOPIC","HELP_ARTICLE","ASSIGNMENT","GROUP","STUDENT","SUBMISSION","USER_WORD","USER_MISTAKE","ACHIEVEMENT"]],748813),e.s(["normalizeSearchQuery",0,s],417726);let i=null;function n(e){return(0,t.createHash)("sha256").update(e).digest("hex")}function l(e=new Date){return new Date(Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate()))}function o(e){return e.toUpperCase()}function u(e){return s(e).toLocaleLowerCase("en")}function c(e){return e instanceof r.Prisma.PrismaClientKnownRequestError&&"P2010"===e.code&&"42P01"===("string"==typeof e.meta?.code?e.meta.code:"")}async function h(){return i||(i=a.prisma.$queryRaw(r.Prisma.sql`
        SELECT
          to_regclass('"SearchHistory"')::text AS "historyTable",
          to_regclass('"SearchQueryMetric"')::text AS "metricTable"
      `).then(e=>!!(e[0]?.historyTable&&e[0]?.metricTable)).catch(()=>!1)),i}async function p(e){if(!await h())return;let s=u(e.query);if(!s)return;let i=n(s),p=o(e.context),d=l();await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultCount", "tookMs", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${e.userId??null}, 'QUERY', ${e.query}, ${s}, ${i}, ${p},
          ${Math.max(0,Math.floor(e.resultCount))}, ${Math.max(0,Math.floor(e.tookMs))}, ${e.locale??null},
          ${e.ip?n(e.ip):null}, ${e.userAgent?.slice(0,512)??null}, NOW()
        )
      `),a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchQueryMetric" (
          "id", "day", "context", "queryHash", "totalSearches", "noResultSearches", "totalClicks", "lastResultCount", "createdAt", "updatedAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${d}, ${p}, ${i}, 1,
          ${+(0===e.resultCount)}, 0, ${Math.max(0,Math.floor(e.resultCount))}, NOW(), NOW()
        )
        ON CONFLICT ("day", "context", "queryHash")
        DO UPDATE SET
          "totalSearches" = "SearchQueryMetric"."totalSearches" + 1,
          "noResultSearches" = "SearchQueryMetric"."noResultSearches" + ${+(0===e.resultCount)},
          "lastResultCount" = ${Math.max(0,Math.floor(e.resultCount))},
          "updatedAt" = NOW()
      `)]).catch(e=>{if(!c(e))throw e})}async function d(e){if(!await h())return;let s=u(e.query);if(!s)return;let i=n(s),p=o(e.context),d=l();await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchHistory" (
          "id", "userId", "eventType", "query", "normalizedQuery", "queryHash", "context",
          "resultType", "resultId", "resultUrl", "position", "locale", "ipHash", "userAgent", "createdAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${e.userId??null}, 'CLICK', ${e.query}, ${s}, ${i}, ${p},
          ${e.resultType}, ${e.resultId.slice(0,191)}, ${e.resultUrl.slice(0,512)}, ${Math.max(0,Math.floor(e.position))},
          ${e.locale??null}, ${e.ip?n(e.ip):null}, ${e.userAgent?.slice(0,512)??null}, NOW()
        )
      `),a.prisma.$executeRaw(r.Prisma.sql`
        INSERT INTO "SearchQueryMetric" (
          "id", "day", "context", "queryHash", "totalSearches", "noResultSearches", "totalClicks", "lastResultCount", "createdAt", "updatedAt"
        )
        VALUES (
          ${(0,t.randomUUID)()}, ${d}, ${p}, ${i}, 0, 0, 1, 0, NOW(), NOW()
        )
        ON CONFLICT ("day", "context", "queryHash")
        DO UPDATE SET
          "totalClicks" = "SearchQueryMetric"."totalClicks" + 1,
          "updatedAt" = NOW()
      `)]).catch(e=>{if(!c(e))throw e})}async function m(e){let t=Math.max(0,Math.floor(e.cursor??0)),s=Math.min(100,Math.max(1,Math.floor(e.limit??20)));if(!await h())return{items:[],total:0,cursor:t,nextCursor:null};try{let i=[r.Prisma.sql`"userId" = ${e.userId}`];e.context&&i.push(r.Prisma.sql`"context" = ${o(e.context)}`),e.eventType&&i.push(r.Prisma.sql`"eventType" = ${e.eventType}`);let n=r.Prisma.sql`WHERE ${r.Prisma.join(i," AND ")}`,[l]=await a.prisma.$queryRaw(r.Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM "SearchHistory"
        ${n}
      `),u=await a.prisma.$queryRaw(r.Prisma.sql`
        SELECT
          "id",
          "eventType",
          "query",
          "context",
          "resultCount",
          "resultType",
          "resultId",
          "resultUrl",
          "position",
          "createdAt"
        FROM "SearchHistory"
        ${n}
        ORDER BY "createdAt" DESC
        LIMIT ${s}
        OFFSET ${t}
      `),c=Number(l?.count??0);return{items:u,total:c,cursor:t,nextCursor:t+s<c?t+s:null}}catch(e){if(c(e))return{items:[],total:0,cursor:t,nextCursor:null};throw e}}async function y(e){let t=Math.min(365,Math.max(1,Math.floor(e?.days??30)));if(!await h())return{periodDays:t,totals:{totalSearches:0,totalClicks:0,noResultSearches:0,clickThroughRate:0,noResultRate:0},byContext:[],daily:[],topQueries:[]};let s=l(new Date(Date.now()-(t-1)*864e5)),i=e?.context?o(e.context):null,n=i?r.Prisma.sql`AND "context" = ${i}`:r.Prisma.empty,u=i?r.Prisma.sql`AND "context" = ${i}`:r.Prisma.empty;try{let[e]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${n}
    `),i=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        "context",
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${n}
      GROUP BY "context"
      ORDER BY "totalSearches" DESC
    `),l=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        "day",
        COALESCE(SUM("totalSearches"), 0)::int AS "totalSearches",
        COALESCE(SUM("totalClicks"), 0)::int AS "totalClicks",
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResultSearches"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${n}
      GROUP BY "day"
      ORDER BY "day" ASC
    `),o=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT
        "queryHash",
        COALESCE(SUM("totalSearches"), 0)::int AS searches,
        COALESCE(SUM("totalClicks"), 0)::int AS clicks,
        COALESCE(SUM("noResultSearches"), 0)::int AS "noResults"
      FROM "SearchQueryMetric"
      WHERE "day" >= ${s}
      ${n}
      GROUP BY "queryHash"
      ORDER BY searches DESC, clicks DESC
      LIMIT 10
    `),c=await a.prisma.$queryRaw(r.Prisma.sql`
        SELECT
          "queryHash",
          "normalizedQuery",
          COUNT(*)::int AS samples
        FROM "SearchHistory"
        WHERE "createdAt" >= ${s}
          AND "eventType" = 'QUERY'
          ${u}
        GROUP BY "queryHash", "normalizedQuery"
        ORDER BY samples DESC
      `),h=new Map;for(let e of c){let t=h.get(e.queryHash);(!t||e.samples>t.samples)&&h.set(e.queryHash,{normalizedQuery:e.normalizedQuery,samples:e.samples})}let p=Number(e?.totalSearches??0),d=Number(e?.totalClicks??0),m=Number(e?.noResultSearches??0);return{periodDays:t,totals:{totalSearches:p,totalClicks:d,noResultSearches:m,clickThroughRate:p?Math.round(d/p*1e3)/10:0,noResultRate:p?Math.round(m/p*1e3)/10:0},byContext:i.map(e=>({...e,clickThroughRate:e.totalSearches?Math.round(e.totalClicks/e.totalSearches*1e3)/10:0,noResultRate:e.totalSearches?Math.round(e.noResultSearches/e.totalSearches*1e3)/10:0})),daily:l,topQueries:o.map(e=>{let t=h.get(e.queryHash),r=t&&t.samples>=3?t.normalizedQuery:null;return{...e,query:r,sampleCount:t?.samples??0}})}}catch(e){if(c(e))return{periodDays:t,totals:{totalSearches:0,totalClicks:0,noResultSearches:0,clickThroughRate:0,noResultRate:0},byContext:[],daily:[],topQueries:[]};throw e}}async function S(e){let t=await y(e);return{generatedAt:new Date().toISOString(),periodDays:t.periodDays,totals:t.totals,byContext:t.byContext,daily:t.daily,topQueries:t.topQueries}}async function E(e){let t=Math.min(1095,Math.max(30,Math.floor(e?.retentionDays??180))),s=e?.dryRun??!1;if(!await h())return{retentionDays:t,dryRun:s,deletedHistoryRows:0,deletedMetricRows:0};let i=new Date(Date.now()-864e5*t),n=l(i),[o]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchHistory"
      WHERE "createdAt" < ${i}
    `),[u]=await a.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "SearchQueryMetric"
      WHERE "day" < ${n}
    `),c=Number(o?.count??0),p=Number(u?.count??0);return s||await a.prisma.$transaction([a.prisma.$executeRaw(r.Prisma.sql`
          DELETE FROM "SearchHistory"
          WHERE "createdAt" < ${i}
        `),a.prisma.$executeRaw(r.Prisma.sql`
          DELETE FROM "SearchQueryMetric"
          WHERE "day" < ${n}
        `)]),{retentionDays:t,dryRun:s,deletedHistoryRows:c,deletedMetricRows:p}}e.s(["cleanupSearchHistory",0,E,"getSearchAnalyticsExport",0,S,"getSearchAnalyticsSummary",0,y,"listUserSearchHistory",0,m,"recordSearchQuery",0,p,"recordSearchResultClick",0,d],129117)},295521,e=>{"use strict";e.s(["COURSE_STAGES",0,["a0","a1","a2","b1","b2","c1","c2","all-levels"],"LEARNING_ACADEMIES",0,[{slug:"general-english",title:"General English",paths:[{slug:"core-journey",title:"Core Journey A0-C2"},{slug:"daily-communication",title:"Daily Communication"},{slug:"academic-fluency",title:"Academic Fluency"}]},{slug:"grammar-academy",title:"Grammar Academy",paths:[{slug:"verb-tenses",title:"Verb Tenses"},{slug:"passive-conditionals",title:"Passive and Conditionals"},{slug:"clauses-word-order",title:"Clauses and Word Order"}]},{slug:"vocabulary-academy",title:"Vocabulary Academy",paths:[{slug:"everyday-topics",title:"Everyday Topics"},{slug:"professional-topics",title:"Professional Topics"},{slug:"science-and-tech",title:"Science and Tech"}]},{slug:"phrasal-verbs-academy",title:"Phrasal Verbs Academy",paths:[{slug:"get-family",title:"GET Family"},{slug:"take-family",title:"TAKE Family"},{slug:"go-come-put",title:"GO, COME, PUT"}]},{slug:"idioms-academy",title:"Idioms Academy",paths:[{slug:"business-idioms",title:"Business Idioms"},{slug:"native-idioms",title:"Native Idioms"},{slug:"topic-idioms",title:"Topic Idioms"}]},{slug:"collocations-academy",title:"Collocations Academy",paths:[{slug:"verb-collocations",title:"Verb Collocations"},{slug:"adjective-collocations",title:"Adjective Collocations"},{slug:"academic-collocations",title:"Academic Collocations"}]},{slug:"synonyms-academy",title:"Synonyms Academy",paths:[{slug:"frequency-bands",title:"Frequency Bands"},{slug:"tone-register",title:"Tone and Register"},{slug:"precision-choice",title:"Precision Choice"}]},{slug:"antonyms-academy",title:"Antonyms Academy",paths:[{slug:"core-opposites",title:"Core Opposites"},{slug:"academic-opposites",title:"Academic Opposites"},{slug:"professional-opposites",title:"Professional Opposites"}]},{slug:"pronunciation-academy",title:"Pronunciation Academy",paths:[{slug:"ipa-and-sounds",title:"IPA and Sounds"},{slug:"rhythm-stress-linking",title:"Rhythm, Stress, Linking"},{slug:"shadowing-lab",title:"Shadowing Lab"}]},{slug:"writing-academy",title:"Writing Academy",paths:[{slug:"email-writing",title:"Email Writing"},{slug:"essay-and-reports",title:"Essays and Reports"},{slug:"cv-cover-letter",title:"CV and Cover Letter"}]},{slug:"speaking-academy",title:"Speaking Academy",paths:[{slug:"small-talk",title:"Small Talk"},{slug:"presentations-negotiation",title:"Presentations and Negotiation"},{slug:"interviews-debates",title:"Interviews and Debates"}]},{slug:"professional-english",title:"Professional English",paths:[{slug:"medical-legal",title:"Medical and Legal"},{slug:"engineering-it-finance",title:"Engineering, IT, Finance"},{slug:"hospitality-tourism-support",title:"Hospitality, Tourism, Support"}]}]])},279219,e=>{"use strict";var t=e.i(254799);e.s(["hashPassword",0,function(e){let r=(0,t.randomBytes)(16).toString("hex"),a=(0,t.scryptSync)(e,r,64).toString("hex");return`scrypt$${r}$${a}`},"passwordNeedsRehash",0,function(e){return!e.startsWith("scrypt$")},"verifyPassword",0,function(e,r){let[a,s,i]=r.split("$");if("scrypt"===a&&s&&i){let r=(0,t.scryptSync)(e,s,64).toString("hex"),a=Buffer.from(i,"hex"),n=Buffer.from(r,"hex");return a.length===n.length&&(0,t.timingSafeEqual)(a,n)}let[n,l]=r.split(":");if(!n||!l)return r===e||(0,t.createHash)("sha256").update(e).digest("hex")===r;let o=(0,t.createHash)("sha256").update(`${n}:${e}`).digest("hex"),u=Buffer.from(l,"hex"),c=Buffer.from(o,"hex");return u.length===c.length&&(0,t.timingSafeEqual)(u,c)}])},393152,e=>{"use strict";let t=/%(2f|5c)/i,r="/dashboard";function a(e,s=r){if(!e||!e.startsWith("/")||e.startsWith("//")||e.includes("\\")||t.test(e))return s;try{let t=new URL(e,"https://krin.invalid");return"https://krin.invalid"===t.origin?`${t.pathname}${t.search}${t.hash}`:s}catch{return s}}function s(e,t,i=r){let n=new URL(t),l=a(i),o=new URL(l,n).toString();try{let t=new URL(e??l,n);if(t.origin!==n.origin)return o;return new URL(a(`${t.pathname}${t.search}${t.hash}`,l),n).toString()}catch{return o}}e.s(["getSafeInternalPath",0,a,"getSafePostAuthRedirectUrl",0,function(e,t){let r=s("/auth/complete",t),a=s(e,t,"/auth/complete"),i=new URL(a);return"/"===i.pathname||"/login"===i.pathname||"/register"===i.pathname||i.pathname.startsWith("/api/auth/")?r:a}])},792509,(e,t,r)=>{t.exports=e.x("url",()=>require("url"))},449719,(e,t,r)=>{t.exports=e.x("assert",()=>require("assert"))},145706,(e,t,r)=>{t.exports=e.x("querystring",()=>require("querystring"))},513925,e=>{"use strict";var t=e.i(160939),r=e.i(757660),a=e.i(430273),s=e.i(419808);async function i(){let e=await (0,s.requireAuth)();if(e)return e.user;let i=await (0,r.getServerSession)(a.nextAuthOptions),n=i?.user.id;if(!n)return null;let l=await t.prisma.user.findUnique({where:{id:n},select:s.AUTHENTICATED_USER_SELECT});return!l||l.deletedAt||l.isBlocked?null:l}e.s(["getCurrentUser",0,i])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1nv9ixs._.js.map