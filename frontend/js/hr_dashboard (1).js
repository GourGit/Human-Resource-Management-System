function showPage(page){

    var sections = document.querySelectorAll(".section");

    for(var i=0;i<sections.length;i++){

        sections[i].classList.remove("active");

    }

    document.getElementById(page).classList.add("active");

}

window.onload=function(){

    showPage("dashboard");

    document.getElementById("employeeEditor").style.display="none";

}

function editProfile(){

    document.getElementById("hrName").readOnly=false;

    document.getElementById("hrEmail").readOnly=false;

    document.getElementById("hrPhone").readOnly=false;

    document.getElementById("hrAddress").readOnly=false;

    document.getElementById("editProfileBtn").style.display="none";

    document.getElementById("saveProfileBtn").style.display="inline-block";

    document.getElementById("cancelProfileBtn").style.display="inline-block";

}

function saveProfile(){

    document.getElementById("hrName").readOnly=true;

    document.getElementById("hrEmail").readOnly=true;

    document.getElementById("hrPhone").readOnly=true;

    document.getElementById("hrAddress").readOnly=true;

    document.getElementById("editProfileBtn").style.display="inline-block";

    document.getElementById("saveProfileBtn").style.display="none";

    document.getElementById("cancelProfileBtn").style.display="none";

    alert("Profile Updated Successfully.");

}

function cancelProfile(){

    document.getElementById("hrName").readOnly=true;

    document.getElementById("hrEmail").readOnly=true;

    document.getElementById("hrPhone").readOnly=true;

    document.getElementById("hrAddress").readOnly=true;

    document.getElementById("editProfileBtn").style.display="inline-block";

    document.getElementById("saveProfileBtn").style.display="none";

    document.getElementById("cancelProfileBtn").style.display="none";

}

function editEmployee(id){

    document.getElementById("employeeEditor").style.display="block";

    document.getElementById("empId").value=id;

}

function saveEmployee(){

    alert("Employee Information Updated Successfully.");

    document.getElementById("employeeEditor").style.display="none";

}

function resetEmployeeForm(){

    document.getElementById("employeeEditor").style.display="none";

}

function searchEmployee(){

    var input=document.getElementById("searchEmployee").value;

    alert("Searching for : "+input);

}

function updateAttendance(){

    alert("Attendance Updated Successfully.");

}

function approveLeave(){

    document.getElementById("leaveStatus1").innerHTML="Approved";

    document.getElementById("leaveStatus1").style.color="green";

    alert("Leave Approved Successfully.");

}

function rejectLeave(){

    document.getElementById("leaveStatus1").innerHTML="Rejected";

    document.getElementById("leaveStatus1").style.color="red";

    alert("Leave Rejected.");

}

function updatePayroll(){

    alert("Payroll Updated Successfully.");

}

function logout(){

    var result=confirm("Are you sure you want to logout?");

    if(result){

        window.location.href="login.html";

    }

}
function changeProfileImage(){

    var file=document.getElementById("imageInput").files[0];

    if(file){

        var reader=new FileReader();

        reader.onload=function(e){

            document.getElementById("profileImage").src=e.target.result;

        };

        reader.readAsDataURL(file);

    }

}