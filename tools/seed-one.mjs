/**
 * Submits a single dataset assessment.  Meant to be run one at a time so
 * we don't stack pending txs on the same nonce.  Usage:
 *
 *   node tools/seed-one.mjs <index>
 *
 * where <index> is 0..3 into SAMPLES from seed.mjs.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient, createAccount } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus, ExecutionResult } from 'genlayer-js/types';

const idx = Number.parseInt(process.argv[2] ?? '0', 10);

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

const sample = SAMPLES[idx];
if (!sample) throw new Error(`no sample at index ${idx}`);

const deployment = JSON.parse(readFileSync(path.resolve('artifacts/deployment.json'), 'utf-8'));
const account = createAccount(process.env.ACCOUNT_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

console.log(`[${idx}] ${sample.label}`);
console.log('  url:', sample.url);

async function attempt() {
  const txHash = await client.writeContract({
    address: deployment.contractAddress,
    functionName: 'assess_dataset',
    args: [sample.url, sample.schema, sample.use, sample.sampleBytes],
    value: BigInt(0),
    consensusMaxRotations: 6,
  });
  console.log('  tx:', txHash);
  console.log(`     https://explorer-bradbury.genlayer.com/tx/${txHash}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 120,
  });
  console.log('  status:', receipt.statusName ?? receipt.status);
  console.log('  execution:', receipt.txExecutionResultName);
  return { txHash, receipt };
}

let lastErr;
for (let a = 1; a <= 3; a++) {
  try {
    const { receipt } = await attempt();
    if (receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN) {
      console.log('  ok on attempt', a);
      process.exit(0);
    }
    console.warn(`  attempt ${a} did not return successfully`);
  } catch (err) {
    lastErr = err;
    console.warn(`  attempt ${a} failed:`, err.shortMessage || err.message);
    if (a < 3) {
      const wait = 20000 * a;
      console.warn(`  waiting ${wait / 1000}s before retry…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}
if (lastErr) throw lastErr;
process.exit(2);
