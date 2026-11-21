--!strict
-- LocalScript in StarterPlayer > StarterPlayerScripts
local storage=game:GetService("ReplicatedStorage")
local input=game:GetService("UserInputService")
local cutscene=require(storage:WaitForChild("CutscenePlayer") :: ModuleScript)
local data=require(storage:WaitForChild("CutsceneData") :: ModuleScript)
local player=cutscene.new(data,{Typewriter=true, HideUI=true, HideCharacter=true})
local tap=input.TouchTap:Connect(function(_,used)
    if not used then player:Stop() end
end)
local key=input.InputBegan:Connect(function(event,used)
    if not used and event.KeyCode==Enum.KeyCode.Space then player:Stop() end
end)
player.Completed:Once(function(reason)
    tap:Disconnect()
    key:Disconnect()
    print("Cutscene ended:",reason)
    player:Destroy()
end)
player:Play()
