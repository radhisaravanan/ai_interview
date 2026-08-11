import React from "react";

import { 
    Link,
    useNavigate
} from "react-router-dom";


import {
    FaTrophy,
    FaChartLine,
    FaMicrophone,
    FaStar,
    FaEye,
    FaRedo,
    FaDownload
} from "react-icons/fa";


import "../assets/css/interviewHistory.css";



function InterviewHistory(){


const navigate = useNavigate();



const interviewHistory = [

{
id:1,
role:"Frontend Developer",
date:"10 July 2026",
score:92,
duration:"18 Minutes",
feedback:"Excellent communication and React knowledge",
status:"Excellent"
},

{
id:2,
role:"Java Developer",
date:"08 July 2026",
score:88,
duration:"25 Minutes",
feedback:"Good technical answers",
status:"Good"
},

{
id:3,
role:"PHP Developer",
date:"05 July 2026",
score:85,
duration:"20 Minutes",
feedback:"Need improvement in explanation",
status:"Good"
},

{
id:4,
role:"Python Developer",
date:"01 July 2026",
score:76,
duration:"22 Minutes",
feedback:"Improve confidence and problem solving",
status:"Average"
}

];





// Total Attempts

const totalAttempts = interviewHistory.length;



// Average Score

const averageScore = Math.round(

interviewHistory.reduce(

(total,item)=>total+item.score,0

)

/ totalAttempts

);




// Best Interview

const bestInterview = interviewHistory.reduce(

(best,item)=>

item.score > best.score ? item : best

);




// Latest Interview

const latestInterview = interviewHistory[0];






return(


<div className="history-container">



<h1>
My Interview Journey 🚀
</h1>


<p>
Track your interview attempts, improvement and AI feedback.
</p>





{/* Summary Cards */}



<div className="summary">


<div className="summary-card">

<FaMicrophone className="summary-icon"/>

<h2>
{totalAttempts}
</h2>

<p>
Total Attempts
</p>

</div>





<div className="summary-card">

<FaChartLine className="summary-icon"/>

<h2>
{averageScore}%
</h2>

<p>
Average Score
</p>

</div>






<div className="summary-card">

<FaTrophy className="summary-icon"/>

<h2>
{bestInterview.score}%
</h2>

<p>
Best Score
</p>

</div>







<div className="summary-card">

<FaStar className="summary-icon"/>

<h2>
+{bestInterview.score-averageScore}%
</h2>

<p>
Improvement
</p>

</div>



</div>







{/* Best Interview */}



<div className="best-card">


<h2>
🏆 My Best Interview
</h2>


<h3>
{bestInterview.role}
</h3>


<p>
📅 Date : {bestInterview.date}
</p>


<p>
⭐ Score : {bestInterview.score}%
</p>


<p>
⏱ Duration : {bestInterview.duration}
</p>





<Link

to="/interview-report"

state={bestInterview}

className="report-btn"

>


<FaEye/>

View Report


</Link>



</div>









{/* Latest Interview */}



<div className="latest-card">


<h2>
Latest Attempt
</h2>


<h3>
{latestInterview.role}
</h3>


<p>
Score : {latestInterview.score}%
</p>


<p>
AI Feedback :
{latestInterview.feedback}
</p>



<button

onClick={()=>navigate("/interview-setup")}

>

<FaRedo/>

Retake Interview

</button>


</div>









{/* Attempts Table */}




<div className="history-table">


<h2>
My Interview Attempts
</h2>



<table>


<thead>


<tr>

<th>
Role
</th>

<th>
Date
</th>

<th>
Score
</th>

<th>
Duration
</th>

<th>
Feedback
</th>

<th>
Status
</th>

<th>
Action
</th>


</tr>


</thead>





<tbody>


{

interviewHistory.map((item)=>(


<tr key={item.id}>


<td>
{item.role}
</td>


<td>
{item.date}
</td>


<td>

<span className="score">

{item.score}%

</span>

</td>


<td>
{item.duration}
</td>



<td>
{item.feedback}
</td>



<td>

<span className="status">

{item.status}

</span>


</td>



<td>



<Link

to="/interview-report"

state={item}

className="small-view"

>

<FaEye/>

</Link>





<button

className="download"

title="Download Report"

>

<FaDownload/>

</button>




</td>



</tr>



))


}



</tbody>



</table>



</div>








{/* Progress */}



<div className="progress-box">


<h2>
My Performance Progress
</h2>



{

interviewHistory.map((item)=>(



<div className="progress-item"

key={item.id}

>


<div>


<span>
{item.role}
</span>



<strong>
{item.score}%
</strong>


</div>




<div className="bar">


<div

className="fill"

style={{

width:item.score+"%"

}}

>

</div>


</div>



</div>



))


}



</div>






</div>


);


}


export default InterviewHistory;