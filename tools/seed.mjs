/**
 * Seeds the deployed SetProof contract with real dataset assessments.
 *
 * Every URL below is a stable public dataset hosted on raw.githubusercontent.com
 * (a .com TLD, as required for anything the contract fetches).  These are
 * well-known ML training benchmarks with different quality profiles so the
 * hosted app has genuine variety to show.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types';

const ACCOUNT_PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY;
if (!ACCOUNT_PRIVATE_KEY) {
  console.error('ERROR: ACCOUNT_PRIVATE_KEY is not set in the environment.');
  process.exit(1);
}

const deployment = JSON.parse(
  readFileSync(path.resolve('artifacts/deployment.json'), 'utf-8'),
);
const address = deployment.contractAddress;
if (!address) throw new Error('Missing contractAddress in artifacts/deployment.json');

const account = createAccount(ACCOUNT_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

const SAMPLES = [
  {
    label: 'Iris (Fisher, 1936)',
    url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv',
    schema: 'sepal_length,sepal_width,petal_length,petal_width,species',
    use: 'supervised multiclass classification of iris flower species from morphometric features',
    sampleBytes: 4096,
  },
  {
    label: 'Titanic passenger list',
    url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
    schema: 'PassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Ticket,Fare,Cabin,Embarked',
    use: 'binary classification of passenger survival on the RMS Titanic',
    sampleBytes: 6144,
  },
  {
    label: 'Vega cars specifications',
    url: 'https://raw.githubusercontent.com/vega/vega-datasets/main/data/cars.json',
    schema: 'Name,Miles_per_Gallon,Cylinders,Displacement,Horsepower,Weight_in_lbs,Acceleration,Year,Origin',
    use: 'regression of fuel economy and comparative analysis across manufacturing origin',
    sampleBytes: 8192,
  },
  {
    label: 'Wine chemical properties',
    url: 'https://raw.githubusercontent.com/tirthajyoti/Machine-Learning-with-Python/master/Datasets/wine.data.csv',
    schema:
      'Class,Alcohol,Malic acid,Ash,Alcalinity of ash,Magnesium,Total phenols,Flavanoids,Nonflavanoid phenols,Proanthocyanins,Color intensity,Hue,OD280/OD315 of diluted wines,Proline',
    use: 'multiclass classification of Italian wine cultivars from chemical measurements',
    sampleBytes: 4096,
  },
];

function shortHash(h) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

async function seedOne(sample, index) {
  console.log(`\n[${index + 1}/${SAMPLES.length}] ${sample.label}`);
  console.log(`  url: ${sample.url}`);

  const txHash = await client.writeContract({
    address,
    functionName: 'assess_dataset',
    args: [sample.url, sample.schema, sample.use, sample.sampleBytes],
    value: BigInt(0),
  });
  console.log(`  tx:  ${txHash}`);
  console.log(`       https://explorer-bradbury.genlayer.com/tx/${txHash}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    interval: 4000,
    retries: 90,
  });

  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    console.warn(`  execution: ${receipt.txExecutionResultName}`);
    return { sample, txHash, ok: false };
  }
  console.log(`  execution: ${receipt.txExecutionResultName}`);
  return { sample, txHash, ok: true };
}

const results = [];
for (let i = 0; i < SAMPLES.length; i++) {
  try {
    const r = await seedOne(SAMPLES[i], i);
    results.push(r);
    // Small pause to be nice to the RPC layer.
    if (i < SAMPLES.length - 1) await new Promise((r) => setTimeout(r, 3000));
  } catch (err) {
    console.error(`  seeding failed: ${err.message}`);
    results.push({ sample: SAMPLES[i], ok: false, error: err.message });
  }
}

console.log('\n---\nfinal state:');
const count = await client.readContract({ address, functionName: 'count', args: [] });
console.log(`certificate count on-chain: ${count}`);

const listed = await client.readContract({
  address,
  functionName: 'list_certificates',
  args: [0, 10],
});
for (const cert of listed) {
  const sc = cert.scorecard || {};
  console.log(
    `  ${cert.assessment_id}  ${cert.tier}  ${sc.overall_score}/100  ${cert.dataset_url}`,
  );
}

const okCount = results.filter((r) => r.ok).length;
console.log(`\nseeded ${okCount}/${SAMPLES.length} assessments successfully.`);
process.exit(okCount === SAMPLES.length ? 0 : 1);
