import type { Question } from '../models/question';
import { buildTextBank, type TextItem } from '../utils/questionBuilder';

/**
 * Original English items for the psychometric English section, SAT Reading & Writing and GMAT Verbal practice.
 * Written for this app (no items copied from official tests). Format: [stem, correct, d1, d2, d3, explanation, difficulty].
 */
const synonyms: TextItem[] = [
  ['abundant', 'plentiful', 'scarce', 'abandoned', 'abrupt', '"Abundant" means existing in large quantities — "plentiful". "Scarce" is its opposite.', 1],
  ['reluctant', 'unwilling', 'eager', 'relevant', 'reliable', '"Reluctant" = hesitant, not wanting to do something.', 1],
  ['candid', 'frank', 'hidden', 'sweet', 'careful', '"Candid" = honest and direct.', 1],
  ['diminish', 'reduce', 'enlarge', 'divide', 'finish', '"Diminish" = make or become smaller.', 1],
  ['meticulous', 'thorough', 'careless', 'quick', 'generous', '"Meticulous" = showing great attention to detail.', 2],
  ['ambiguous', 'unclear', 'certain', 'ambitious', 'enormous', '"Ambiguous" = open to more than one interpretation.', 2],
  ['benevolent', 'kind', 'cruel', 'wealthy', 'lazy', '"Benevolent" = well-meaning and kindly ("bene" = good).', 2],
  ['ephemeral', 'short-lived', 'eternal', 'ethereal', 'enormous', '"Ephemeral" = lasting a very short time.', 3],
  ['pragmatic', 'practical', 'idealistic', 'dramatic', 'automatic', '"Pragmatic" = dealing with things sensibly and realistically.', 2],
  ['scrutinize', 'examine closely', 'ignore', 'praise', 'scatter', '"Scrutinize" = inspect carefully.', 2],
  ['obsolete', 'outdated', 'modern', 'obvious', 'stubborn', '"Obsolete" = no longer in use.', 2],
  ['tenacious', 'persistent', 'fragile', 'tense', 'timid', '"Tenacious" = holding firmly, not giving up.', 3],
  ['lucid', 'clear', 'confused', 'lucky', 'dark', '"Lucid" = expressed clearly, easy to understand.', 2],
  ['frugal', 'thrifty', 'wasteful', 'fragile', 'fruitful', '"Frugal" = economical with money or food.', 2],
  ['mitigate', 'ease', 'worsen', 'imitate', 'migrate', '"Mitigate" = make less severe.', 3],
  ['inevitable', 'unavoidable', 'unlikely', 'invisible', 'invaluable', '"Inevitable" = certain to happen.', 2],
  ['concise', 'brief', 'wordy', 'precise', 'concerned', '"Concise" = giving a lot of information clearly in few words.', 1],
  ['hostile', 'unfriendly', 'welcoming', 'hospitable', 'hasty', '"Hostile" = aggressive, unfriendly. Careful: "hospitable" is its opposite.', 1],
  ['undermine', 'weaken', 'support', 'understand', 'underline', '"Undermine" = damage or weaken gradually.', 2],
  ['prolific', 'productive', 'idle', 'profitable', 'prominent', '"Prolific" = producing much (a prolific author).', 3],
];

const completions: TextItem[] = [
  ['Although the plan seemed simple on paper, carrying it out proved far more ___ than anyone expected.', 'complicated', 'obvious', 'pleasant', 'brief', '"Although" signals contrast with "simple" → the opposite idea: complicated.', 1],
  ['The scientist was ___ about the results: she refused to publish them until the experiment had been repeated three times.', 'cautious', 'careless', 'indifferent', 'boastful', 'Refusing to publish before repeating the experiment shows caution.', 1],
  ['Because the bridge had been ___ for decades, engineers were surprised it was still standing.', 'neglected', 'maintained', 'admired', 'reinforced', '"Surprised it was still standing" implies it was not taken care of.', 2],
  ['Her argument was so ___ that even her strongest critics admitted they could not refute it.', 'compelling', 'weak', 'vague', 'emotional', 'Critics could not refute it → the argument was convincing.', 2],
  ['The new policy was intended to ___ traffic congestion, but in fact it made the problem worse.', 'alleviate', 'increase', 'describe', 'ignore', '"Intended to … but made it worse" → it was meant to reduce (alleviate) congestion.', 2],
  ['Despite his ___ manner in public, close friends described him as warm and talkative.', 'reserved', 'friendly', 'loud', 'generous', '"Despite" contrasts with "warm and talkative" → reserved.', 2],
  ['The museum\'s collection is remarkably ___, ranging from ancient pottery to digital art.', 'diverse', 'uniform', 'small', 'modern', '"Ranging from … to …" describes variety.', 1],
  ['Critics found the novel\'s ending ___: after hundreds of pages of tension, the conflict was resolved in a single sentence.', 'abrupt', 'gradual', 'predictable', 'lengthy', 'Resolving everything in one sentence after long tension = abrupt.', 3],
  ['The company\'s profits were ___, rising sharply one quarter and collapsing the next.', 'volatile', 'stable', 'modest', 'secret', 'Sharp rises and collapses = volatile.', 3],
  ['Rather than ___ the issue, the committee chose to discuss it openly at the next meeting.', 'evade', 'address', 'explain', 'publish', '"Rather than X, chose to discuss openly" → X is the opposite: avoid/evade.', 2],
];

const restatements: TextItem[] = [
  ['"Few people expected the small startup to outlast its larger competitors."', 'Most people thought the larger competitors would survive longer than the startup.', 'Most people expected the startup to grow larger than its competitors.', 'The startup expected to outlast its larger competitors.', 'Few competitors were larger than the startup.', 'A restatement keeps the meaning: people expected the startup NOT to outlast the big competitors.', 2],
  ['"The report was not without its flaws."', 'The report had some flaws.', 'The report had no flaws.', 'The report was flawless and complete.', 'The flaws were not in the report.', '"Not without" is a double negative = it had flaws.', 2],
  ['"Only after the storm had passed did the rescue teams begin their work."', 'The rescue teams started working once the storm was over.', 'The rescue teams worked during the storm.', 'The storm passed because the rescue teams worked.', 'Only the rescue teams worked after the storm.', '"Only after X did Y" = Y started when X ended.', 2],
  ['"Hardly anyone noticed the change in the logo."', 'Almost nobody noticed that the logo had changed.', 'Everyone noticed the logo was hard to see.', 'The logo was changed by hardly anyone.', 'Many people noticed the change in the logo.', '"Hardly anyone" = almost no one.', 1],
  ['"Were it not for the volunteers, the festival could not have taken place."', 'The festival happened thanks to the volunteers.', 'The festival happened without volunteers.', 'The volunteers did not want the festival to take place.', 'The festival was cancelled despite the volunteers.', '"Were it not for X, Y could not have happened" = X made Y possible.', 3],
];

const englishAnalogies: TextItem[] = [
  ['pen : write', 'knife : cut', 'book : read', 'paper : fold', 'pencil : eraser', 'A tool and the action it is used for.', 1],
  ['drought : water', 'famine : food', 'flood : rain', 'desert : sand', 'thirst : drink', 'A severe lack of something.', 2],
  ['novice : expert', 'apprentice : master', 'teacher : student', 'doctor : patient', 'player : team', 'The beginner and the highly skilled stage of the same path.', 2],
  ['chapter : book', 'verse : poem', 'page : library', 'actor : film', 'word : dictionary', 'A part of a whole of the same kind of work.', 2],
  ['timid : bold', 'frugal : extravagant', 'quiet : silent', 'brave : heroic', 'happy : glad', 'Opposite character traits.', 2],
];

const SYN = (w: string) => `Choose the word closest in meaning to: "${w}"`;
const COMP = (s: string) => `Choose the word that best completes the sentence:\n${s}`;
const REST = (s: string) => `Which sentence best restates the following?\n${s}`;
const ANA = (s: string) => `Choose the pair with the same relationship as  ${s}`;

const ltr = (qs: Question[]): Question[] => qs.map((q) => ({ ...q, dir: 'ltr' as const }));

export const englishQuestions: Question[] = ltr([
  ...buildTextBank('english', 'Vocabulary', 'en-syn', SYN, synonyms),
  ...buildTextBank('english', 'Sentence completion', 'en-comp', COMP, completions),
  ...buildTextBank('english', 'Restatement', 'en-rest', REST, restatements),
  ...buildTextBank('english', 'Analogies', 'en-ana', ANA, englishAnalogies),
]);
