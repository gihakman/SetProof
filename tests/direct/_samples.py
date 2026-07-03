"""Reusable sample data for direct-mode tests."""

import json


VALID_LLM_RESPONSE = {
    "dimensions": {
        "bias": 8,
        "relevance": 9,
        "label_quality": 7,
        "diversity": 8,
        "freshness": 8,
    },
    "analysis": (
        "The Iris dataset is a small, clean flower-classification benchmark "
        "with balanced classes and no missing values. It is dated (1936) but "
        "still widely used as a baseline for classifiers."
    ),
    "concerns": [
        "Very small (150 rows) so results may not generalize.",
        "Not representative of modern botanical taxonomy.",
    ],
}


BROKEN_LLM_RESPONSE = "not-json at all"


IRIS_CSV = (
    "sepal_length,sepal_width,petal_length,petal_width,species\n"
    "5.1,3.5,1.4,0.2,setosa\n"
    "4.9,3.0,1.4,0.2,setosa\n"
    "4.7,3.2,1.3,0.2,setosa\n"
    "6.4,3.2,4.5,1.5,versicolor\n"
    "6.9,3.1,4.9,1.5,versicolor\n"
    "6.3,3.3,6.0,2.5,virginica\n"
    "5.8,2.7,5.1,1.9,virginica\n"
)


DIRTY_CSV = (
    "id,label,value\n"
    "1,,\n"
    "2,,\n"
    "3,ok,42\n"
    ",broken\n"
    "5,ok,7\n"
)


JSON_SAMPLE = json.dumps(
    {
        "data": [
            {"id": 1, "text": "hello", "label": "greeting"},
            {"id": 2, "text": "goodbye", "label": "farewell"},
            {"id": 3, "text": "hello", "label": "greeting"},
            {"id": 4, "text": "", "label": None},
        ]
    }
)
