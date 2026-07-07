import React from 'react';

/**
 * Public dataset samples reviewers can load into the submit form and
 * certify end-to-end.  Every URL below has been verified to respond
 * with 200 and to fit inside the contract's byte budget.
 *
 * `expected` is the tier the LLM+structural pipeline typically produces
 * on this dataset today.  It is a hint for reviewers, not a guarantee:
 * the on-chain outcome is decided by validator consensus at submit
 * time and may drift if the underlying file changes.
 */
export const EXAMPLES = [
  {
    key: 'iris',
    name: 'Iris',
    subtitle: 'Fisher, 1936',
    blurb:
      'Balanced 150-row flower benchmark with no missing values. A best-case dataset for structural checks.',
    url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv',
    schema: 'sepal_length,sepal_width,petal_length,petal_width,species',
    use: 'supervised multiclass classification of iris flower species from morphometric features',
    bytes: 4096,
    stats: '5 cols · 150 rows · CSV',
    expected: 'TIER_1_EXCELLENT',
  },
  {
    key: 'titanic',
    name: 'Titanic passengers',
    subtitle: 'kaggle mirror',
    blurb:
      'Historical passenger records with missing Age and Cabin values plus class imbalance on the survival label.',
    url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
    schema:
      'PassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Ticket,Fare,Cabin,Embarked',
    use: 'binary classification of passenger survival on the RMS Titanic',
    bytes: 6144,
    stats: '12 cols · 891 rows · CSV',
    expected: 'TIER_2_GOOD',
  },
  {
    key: 'cars',
    name: 'Vega cars',
    subtitle: 'vega-datasets',
    blurb:
      'Automotive specs from 1970-1982. Structurally clean JSON, but freshness suffers for a modern use case.',
    url: 'https://raw.githubusercontent.com/vega/vega-datasets/main/data/cars.json',
    schema:
      'Name,Miles_per_Gallon,Cylinders,Displacement,Horsepower,Weight_in_lbs,Acceleration,Year,Origin',
    use: 'regression of fuel economy and comparative analysis across manufacturing origin',
    bytes: 8192,
    stats: '9 cols · 406 rows · JSON',
    expected: 'TIER_3_ACCEPTABLE',
  },
  {
    key: 'wine',
    name: 'Wine cultivars',
    subtitle: 'UCI ML repository',
    blurb:
      '178 wine samples across three cultivars with thirteen chemical measurements. Small but clean.',
    url: 'https://raw.githubusercontent.com/tirthajyoti/Machine-Learning-with-Python/master/Datasets/wine.data.csv',
    schema:
      'Class,Alcohol,Malic acid,Ash,Alcalinity of ash,Magnesium,Total phenols,Flavanoids,Nonflavanoid phenols,Proanthocyanins,Color intensity,Hue,OD280/OD315 of diluted wines,Proline',
    use: 'multiclass classification of Italian wine cultivars from chemical measurements',
    bytes: 4096,
    stats: '14 cols · 178 rows · CSV',
    expected: 'TIER_2_GOOD',
  },
];

const TIER_TO_CLASS = {
  TIER_1_EXCELLENT: 'tier--t1',
  TIER_2_GOOD: 'tier--t2',
  TIER_3_ACCEPTABLE: 'tier--t3',
  TIER_4_POOR: 'tier--t4',
};

const TIER_LABEL = {
  TIER_1_EXCELLENT: 'Excellent',
  TIER_2_GOOD: 'Good',
  TIER_3_ACCEPTABLE: 'Acceptable',
  TIER_4_POOR: 'Poor',
};

export function ExampleTiles({ onLoad, activeKey }) {
  return (
    <div className="examples">
      <header className="examples__head">
        <div>
          <p className="section__eyebrow" style={{ margin: 0 }}>
            examples
          </p>
          <h3 className="examples__title">
            Load a public dataset and certify it end to end.
          </h3>
        </div>
        <p className="examples__hint">
          Each dataset has a different structural profile so you can see
          how the tier system reacts. Click load, then hit certify.
        </p>
      </header>

      <div className="examples__grid">
        {EXAMPLES.map((ex, i) => {
          const active = activeKey === ex.key;
          return (
            <article
              key={ex.key}
              className={`example ${active ? 'example--active' : ''}`}
            >
              <div className="example__row">
                <span className="example__index">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={`tier ${TIER_TO_CLASS[ex.expected]}`}>
                  <span className="tier__dot" />
                  expected · {TIER_LABEL[ex.expected]}
                </div>
              </div>

              <h4 className="example__name">{ex.name}</h4>
              <p className="example__sub">{ex.subtitle}</p>
              <p className="example__blurb">{ex.blurb}</p>

              <dl className="example__meta">
                <div>
                  <dt>shape</dt>
                  <dd>{ex.stats}</dd>
                </div>
                <div>
                  <dt>use</dt>
                  <dd className="example__use">{ex.use}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn btn--ghost example__load"
                onClick={() => onLoad(ex)}
              >
                {active ? 'loaded ↓' : 'load into form ↓'}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
